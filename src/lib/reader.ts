import { createReader } from '@keystatic/core/reader';
import { createGitHubReader } from '@keystatic/core/reader/github';
import keystaticConfig from '../../keystatic.config';

/**
 * Cloudflare Workers fetch patch
 * 
 * Keystatic'in GitHub reader'ı:
 * 1) fetch({ cache: 'no-store' }) kullanıyor — CF Workers bunu desteklemiyor
 * 2) User-Agent header'ı eklemiyor — GitHub API 403 döndürüyor
 * 
 * Bu patch global fetch'i sarmalayarak her iki sorunu da çözer.
 */
if (!import.meta.env.DEV) {
    const _originalFetch = globalThis.fetch;
    globalThis.fetch = function patchedFetch(input: any, init?: any) {
        if (init) {
            const { cache: _cache, ...rest } = init;
            // GitHub API isteklerinde User-Agent zorunlu
            const headers = new Headers(rest.headers || {});
            if (!headers.has('User-Agent')) {
                headers.set('User-Agent', 'netmimar-keystatic');
            }
            return _originalFetch(input, { ...rest, headers });
        }
        return _originalFetch(input);
    };
}

/**
 * Keystatic Reader Factory
 * 
 * Development: Local filesystem reader (dosyaları diskten okur)
 * Production:  GitHub API reader (dosyaları GitHub'dan okur)
 * 
 * Cloudflare Workers'da filesystem olmadığı için production'da
 * GitHub reader kullanılması zorunludur.
 * 
 * @param token - GITHUB_TOKEN (Astro.locals.runtime?.env?.GITHUB_TOKEN)
 */
export function getReader(token?: string) {
    if (import.meta.env.DEV) {
        return createReader(process.cwd(), keystaticConfig);
    }

    const owner = import.meta.env.PUBLIC_REPO_OWNER || 'muhone-sudo';
    const name = import.meta.env.PUBLIC_REPO_NAME || 'netmimar';

    return createGitHubReader(keystaticConfig, {
        repo: `${owner}/${name}`,
        token,
    });
}
