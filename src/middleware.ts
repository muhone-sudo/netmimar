import { defineMiddleware } from 'astro:middleware';

/**
 * Cloudflare Workers fetch patch (minimal)
 * 
 * CF Workers 'cache' alanını desteklemiyor. Keystatic admin panelinin
 * dahili fetch çağrıları bu alanı kullanabilir. Güvenlik için siliyoruz.
 */
if (!(globalThis as any).__fetchPatched) {
    const _originalFetch = globalThis.fetch;
    globalThis.fetch = function patchedFetch(input: any, init?: any) {
        if (init?.cache) {
            const { cache: _cache, ...rest } = init;
            return _originalFetch(input, rest);
        }
        return _originalFetch(input, init);
    };
    (globalThis as any).__fetchPatched = true;
}

/**
 * NetMimar Auth Middleware
 * /keystatic ve /api/keystatic yollarını korur.
 * Geçerli session cookie'si olmayan istekleri /login'e yönlendirir.
 */
export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Korunan yollar
    const protectedPaths = ['/keystatic', '/api/keystatic'];
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

    if (!isProtected) {
        return next();
    }

    // Session cookie kontrolü
    const sessionCookie = context.cookies.get('netmimar_session')?.value;

    if (!sessionCookie) {
        return context.redirect('/login', 302);
    }

    // Cookie imzasını doğrula
    try {
        const env = context.locals.runtime.env;
        const secret = env.COOKIE_SECRET;

        // Cookie formatı: payload.signature
        const lastDotIndex = sessionCookie.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return context.redirect('/login', 302);
        }

        const payload = sessionCookie.substring(0, lastDotIndex);
        const signature = sessionCookie.substring(lastDotIndex + 1);

        // HMAC doğrulaması (Web Crypto API - Cloudflare Workers uyumlu)
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const expectedSignatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(payload)
        );

        const expectedSignature = btoa(
            String.fromCharCode(...new Uint8Array(expectedSignatureBuffer))
        )
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        if (signature !== expectedSignature) {
            return context.redirect('/login', 302);
        }

        // Cookie süresi kontrolü
        const data = JSON.parse(atob(payload));
        if (data.exp && Date.now() > data.exp) {
            // Süresi dolmuş cookie'yi temizle
            context.cookies.delete('netmimar_session', { path: '/' });
            return context.redirect('/login', 302);
        }
    } catch {
        return context.redirect('/login', 302);
    }

    return next();
});
