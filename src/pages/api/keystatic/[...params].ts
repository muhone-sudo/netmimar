import type { APIRoute } from 'astro';

/**
 * GitHub API Proxy for Keystatic
 * Tüm Keystatic CMS isteklerini GitHub API'ye proxy'ler.
 * Agency'nin GITHUB_TOKEN'ını enjekte eder, böylece müşteri GitHub bilmez.
 *
 * Keystatic'ın kendi iç auth route'ları (github/login, github/refresh-token vb.)
 * GitHub API'ye değil, burada özel olarak handle edilir.
 */
const handler: APIRoute = async (context) => {
    const env = context.locals.runtime.env;

    // Session doğrulaması (middleware zaten yapıyor, ekstra güvenlik katmanı)
    const sessionCookie = context.cookies.get('netmimar_session')?.value;
    if (!sessionCookie) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const params = context.params.params || '';

    // --- Keystatic iç auth route'larını handle et ---
    // Bu route'lar GitHub API endpoint'i değil, Keystatic'in kendi auth akışı için.

    // github/login — Keystatic "Log in with GitHub" butonuna basıldığında gelir.
    // Token zaten login sırasında cookie olarak set edildi, keystatic'e geri yönlendir.
    if (params === 'github/login') {
        // Token cookie'sini yenile (eğer expire olduysa)
        context.cookies.set('keystatic-gh-access-token', env.GITHUB_TOKEN, {
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });
        return context.redirect('/keystatic', 302);
    }

    // github/refresh-token — Keystatic token yenilemek istediğinde gelir.
    // PAT (Personal Access Token) expire olmaz, direkt 200 dön.
    if (params === 'github/refresh-token') {
        context.cookies.set('keystatic-gh-access-token', env.GITHUB_TOKEN, {
            httpOnly: false,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // github/logout — Keystatic çıkışı
    if (params === 'github/logout') {
        context.cookies.delete('keystatic-gh-access-token', { path: '/' });
        return context.redirect('/keystatic', 302);
    }

    // github/repo-not-found — Repo bulunamadı hatası
    if (params === 'github/repo-not-found') {
        return context.redirect('/keystatic', 302);
    }

    // --- Normal GitHub API proxy ---
    // /api/keystatic/repos/owner/repo/... → https://api.github.com/repos/owner/repo/...
    const targetUrl = new URL(params, 'https://api.github.com/');

    // Orijinal query parametrelerini koru
    const originalUrl = new URL(context.request.url);
    targetUrl.search = originalUrl.search;

    // İstek header'larını kopyala (bazıları hariç)
    const headers = new Headers();
    const skipHeaders = new Set([
        'host',
        'cookie',
        'connection',
        'content-length',
        'transfer-encoding',
    ]);

    for (const [key, value] of context.request.headers.entries()) {
        if (!skipHeaders.has(key.toLowerCase())) {
            headers.set(key, value);
        }
    }

    // GitHub token enjeksiyonu
    headers.set('Authorization', `Bearer ${env.GITHUB_TOKEN}`);
    headers.set('Accept', 'application/vnd.github.v3+json');
    headers.set('User-Agent', 'NetMimar-CMS-Proxy/1.0');

    // İsteği GitHub API'ye forward et
    const fetchOptions: RequestInit = {
        method: context.request.method,
        headers,
    };

    // Body olan istekler (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(context.request.method)) {
        fetchOptions.body = await context.request.arrayBuffer();
    }

    try {
        const response = await fetch(targetUrl.toString(), fetchOptions);

        // Yanıt header'larını kopyala
        const responseHeaders = new Headers();
        const skipResponseHeaders = new Set([
            'content-encoding',
            'transfer-encoding',
            'connection',
        ]);

        for (const [key, value] of response.headers.entries()) {
            if (!skipResponseHeaders.has(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        }

        // CORS header'ları
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('GitHub API Proxy Error:', error);
        return new Response(
            JSON.stringify({ error: 'Proxy error', message: 'GitHub API isteği başarısız oldu' }),
            {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};

// Tüm HTTP metotlarını destekle
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;

// CORS preflight
export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
};
