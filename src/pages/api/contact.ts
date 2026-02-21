import type { APIRoute } from 'astro';
import settings from '../../content/singletons/settings.json';

/**
 * Contact Form API Endpoint
 * 1. Form verilerini Cloudflare D1 veritabanına kaydeder.
 * 2. settings.json'daki contactEmail doluysa Resend API ile bildirim gönderir.
 *
 * NOT: settings.json build sırasında bundle'a dahil edilir.
 * Müşteri Keystatic'ten e-posta adresini değiştirirse yeni build çalışır → yeni adres aktif olur.
 */
export const POST: APIRoute = async (context) => {
    const env = context.locals.runtime.env;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const contentType = context.request.headers.get('content-type') || '';
        let name: string | null = null;
        let email: string | null = null;
        let phone: string | null = null;
        let message: string | null = null;

        if (
            contentType.includes('application/x-www-form-urlencoded') ||
            contentType.includes('multipart/form-data')
        ) {
            const formData = await context.request.formData();
            name = formData.get('name') as string;
            email = formData.get('email') as string;
            phone = formData.get('phone') as string;
            message = formData.get('message') as string;
        } else {
            const body = await context.request.json();
            name = body.name;
            email = body.email;
            phone = body.phone;
            message = body.message;
        }

        // Doğrulama
        const errors: string[] = [];
        if (!name || name.trim().length === 0) errors.push('İsim alanı zorunludur.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Geçerli bir e-posta adresi giriniz.');
        if (!message || message.trim().length < 10) errors.push('Mesaj en az 10 karakter olmalıdır.');

        if (errors.length > 0) {
            return new Response(
                JSON.stringify({ success: false, errors }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        // D1 veritabanına kaydet
        const result = await env.DB.prepare(
            'INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)'
        )
            .bind(name!.trim(), email!.trim(), phone?.trim() || null, message!.trim())
            .run();

        // E-posta bildirimi — Resend API (RESEND_API_KEY ve contactEmail doluysa)
        const contactEmail = (settings as any).contactEmail?.trim();
        const senderName = (settings as any).contactEmailSenderName?.trim() || 'İletişim Formu';
        const resendKey = env.RESEND_API_KEY;

        if (contactEmail && resendKey) {
            try {
                const emailBody = `
<h2>Yeni İletişim Formu Mesajı</h2>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;">
  <tr><td style="padding:8px;font-weight:bold;width:120px;">İsim:</td><td style="padding:8px;">${name!.trim()}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;">E-posta:</td><td style="padding:8px;"><a href="mailto:${email!.trim()}">${email!.trim()}</a></td></tr>
  ${phone?.trim() ? `<tr><td style="padding:8px;font-weight:bold;">Telefon:</td><td style="padding:8px;">${phone.trim()}</td></tr>` : ''}
  <tr><td style="padding:8px;font-weight:bold;vertical-align:top;">Mesaj:</td><td style="padding:8px;white-space:pre-wrap;">${message!.trim()}</td></tr>
</table>
<hr/>
<p style="color:#888;font-size:12px;">Bu e-posta web sitesi iletişim formu tarafından otomatik olarak gönderilmiştir.</p>
`.trim();

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: `${senderName} <onboarding@resend.dev>`,
                        to: [contactEmail],
                        reply_to: email!.trim(),
                        subject: `Yeni Mesaj: ${name!.trim()}`,
                        html: emailBody,
                    }),
                });
            } catch (emailErr) {
                // E-posta hatası formu başarısız saymaz — D1'e kayıt yapıldı
                console.error('Resend email error:', emailErr);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
                id: result.meta.last_row_id,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
        );
    } catch (error) {
        console.error('Contact form error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                errors: ['Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.'],
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
        );
    }
};

// CORS preflight
export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
};
