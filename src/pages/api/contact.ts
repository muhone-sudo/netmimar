import type { APIRoute } from 'astro';

/**
 * Contact Form API Endpoint
 * Form verilerini Cloudflare D1 veritabanına kaydeder.
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
