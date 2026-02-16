import type { APIRoute } from 'astro';

/**
 * Logout Handler
 * Session cookie'yi temizler ve login sayfasına yönlendirir.
 */
export const GET: APIRoute = async (context) => {
    context.cookies.delete('netmimar_session', { path: '/' });
    return context.redirect('/login', 302);
};

export const POST: APIRoute = async (context) => {
    context.cookies.delete('netmimar_session', { path: '/' });
    return context.redirect('/login', 302);
};
