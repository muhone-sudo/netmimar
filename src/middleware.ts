import { defineMiddleware } from 'astro:middleware';

/**
 * Cloudflare Workers fetch patch
 * 
 * Keystatic'in GitHub reader'ı:
 * 1) fetch({ cache: 'no-store' }) kullanıyor — CF Workers bunu desteklemiyor
 * 2) User-Agent header'ı eklemiyor — GitHub API 403 döndürüyor
 * 3) Her sayfa yüklemesinde çok sayıda GitHub API isteği yapılıyor — yavaş
 * 
 * Bu patch:
 * - 'cache' alanını siler (CF Workers uyumluluğu)
 * - User-Agent header'ı ekler (GitHub API zorunluluğu)
 * - GitHub API isteklerini Cloudflare edge'de 60sn cache'ler (performans)
 */
if (!(globalThis as any).__fetchPatched) {
    const _originalFetch = globalThis.fetch;
    globalThis.fetch = function patchedFetch(input: any, init?: any) {
        const url = typeof input === 'string' ? input : input?.url || '';
        const isGitHubApi = url.includes('api.github.com');

        if (init) {
            const { cache: _cache, ...rest } = init;
            const headers = new Headers(rest.headers || {});
            if (!headers.has('User-Agent')) {
                headers.set('User-Agent', 'netmimar-keystatic');
            }
            // GitHub API yanıtlarını Cloudflare edge'de 60sn cache'le
            if (isGitHubApi) {
                return _originalFetch(input, {
                    ...rest,
                    headers,
                    cf: { cacheTtl: 60, cacheEverything: true },
                } as any);
            }
            return _originalFetch(input, { ...rest, headers });
        }

        if (isGitHubApi) {
            return _originalFetch(input, {
                headers: { 'User-Agent': 'netmimar-keystatic' },
                cf: { cacheTtl: 60, cacheEverything: true },
            } as any);
        }
        return _originalFetch(input);
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
