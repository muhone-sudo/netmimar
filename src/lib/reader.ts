import { createReader } from '@keystatic/core/reader';
import { createGitHubReader } from '@keystatic/core/reader/github';
import keystaticConfig from '../../keystatic.config';

/**
 * Cloudflare Workers fetch patch
 * 
 * Keystatic'in GitHub reader'ı fetch({ cache: 'no-store' }) kullanıyor.
 * Cloudflare Workers 'cache' alanını desteklemiyor ve hata fırlatıyor:
 * "The 'cache' field on 'RequestInitializerDict' is not implemented."
 * 
 * Bu patch global fetch'i sarmalayarak 'cache' alanını otomatik siler.
 */
if (!import.meta.env.DEV) {
    const _originalFetch = globalThis.fetch;
    globalThis.fetch = function patchedFetch(input: any, init?: any) {
        if (init) {
            const { cache: _cache, ...rest } = init;
            return _originalFetch(input, rest);
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
