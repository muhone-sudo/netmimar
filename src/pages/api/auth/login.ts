import type { APIRoute } from 'astro';

/**
 * Login API Handler
 * CLIENT_EMAIL ve CLIENT_PASSWORD environment variable'ları ile karşılaştırma yapar.
 * Başarılı girişte HMAC imzalı session cookie set eder.
 */
export const POST: APIRoute = async (context) => {
    const env = context.locals.runtime.env;

    try {
        const contentType = context.request.headers.get('content-type') || '';
        let email: string | null = null;
        let password: string | null = null;

        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await context.request.formData();
            email = formData.get('email') as string;
            password = formData.get('password') as string;
        } else {
            const body = await context.request.json();
            email = body.email;
            password = body.password;
        }

        if (!email || !password) {
            return context.redirect('/login?error=1', 302);
        }

        // Credential doğrulama
        const validEmail = env.CLIENT_EMAIL;
        const validPassword = env.CLIENT_PASSWORD;

        if (email !== validEmail || password !== validPassword) {
            return context.redirect('/login?error=1', 302);
        }

        // Session cookie oluştur (24 saat geçerli)
        const payload = btoa(
            JSON.stringify({
                email,
                iat: Date.now(),
                exp: Date.now() + 24 * 60 * 60 * 1000, // 24 saat
            })
        );

        // HMAC imzası (Web Crypto API)
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(env.COOKIE_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(payload)
        );

        const signature = btoa(
            String.fromCharCode(...new Uint8Array(signatureBuffer))
        )
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const cookieValue = `${payload}.${signature}`;

        // Cookie set et
        context.cookies.set('netmimar_session', cookieValue, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 saat
        });

        // Keystatic paneline yönlendir
        return context.redirect('/keystatic', 302);
    } catch (error) {
        console.error('Login error:', error);
        return context.redirect('/login?error=1', 302);
    }
};
