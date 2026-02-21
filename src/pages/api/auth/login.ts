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
        let nextPath: string | null = null;

        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await context.request.formData();
            email = formData.get('email') as string;
            password = formData.get('password') as string;
            nextPath = formData.get('next') as string | null;
        } else {
            const body = await context.request.json();
            email = body.email;
            password = body.password;
            nextPath = body.next ?? null;
        }

        if (!email || !password) {
            const q = nextPath ? `?error=1&next=${encodeURIComponent(nextPath)}` : '?error=1';
            return context.redirect(`/login${q}`, 302);
        }

        // Credential doğrulama
        const validEmail = env.CLIENT_EMAIL;
        const validPassword = env.CLIENT_PASSWORD;

        if (email !== validEmail || password !== validPassword) {
            const q = nextPath ? `?error=1&next=${encodeURIComponent(nextPath)}` : '?error=1';
            return context.redirect(`/login${q}`, 302);
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

        // HTTPS kontrolü — localhost'ta (HTTP) secure:true cookie saklanmaz
        const isSecure = context.request.url.startsWith('https://');

        // Cookie set et
        context.cookies.set('netmimar_session', cookieValue, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 saat
        });

        // Keystatic GitHub access token cookie'si
        // Keystatic frontend bu cookie'yi okuyarak "authenticated" kabul eder.
        // Böylece "Log in with GitHub" butonu görünmez, GitHub OAuth gerekmez.
        context.cookies.set('keystatic-gh-access-token', env.GITHUB_TOKEN, {
            httpOnly: false, // Keystatic frontend JS ile okuyor (document.cookie)
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 saat
        });

        // Giriş sonrası yönlendirme: next parametresi varsa oraya, yoksa /keystatic
        const redirectTo = (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) ? nextPath : '/keystatic';
        return context.redirect(redirectTo, 302);
    } catch (error) {
        console.error('Login error:', error);
        return context.redirect('/login?error=1', 302);
    }
};
