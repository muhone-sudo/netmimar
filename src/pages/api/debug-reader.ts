import type { APIRoute } from 'astro';
import { getReader } from '../../lib/reader';

/**
 * DEBUG ENDPOINT — Geçici, production'da silinecek
 * Reader'ın çalışıp çalışmadığını test eder
 */
export const GET: APIRoute = async (context) => {
    const env = context.locals.runtime?.env;
    const token = env?.GITHUB_TOKEN;
    const owner = import.meta.env.PUBLIC_REPO_OWNER || 'muhone-sudo';
    const name = import.meta.env.PUBLIC_REPO_NAME || 'netmimar';
    const repo = `${owner}/${name}`;

    const debug: Record<string, any> = {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 7) || 'MISSING',
        repo,
        envMode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        publicRepoOwner: import.meta.env.PUBLIC_REPO_OWNER || '(fallback)',
        publicRepoName: import.meta.env.PUBLIC_REPO_NAME || '(fallback)',
        fetchPatched: !!(globalThis as any).__fetchPatched,
    };

    // Test 1: GitHub API direct
    try {
        const resp = await fetch(`https://api.github.com/repos/${repo}/contents/src/content/singletons/settings.json`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'netmimar-debug',
            },
        });
        debug.githubApiStatus = resp.status;
        debug.githubApiOk = resp.ok;
        if (resp.ok) {
            const data = await resp.json() as any;
            const content = atob(data.content.replace(/\n/g, ''));
            debug.settingsFileExists = true;
            debug.settingsPreview = content.substring(0, 200);
        } else {
            const errText = await resp.text();
            debug.githubApiError = errText.substring(0, 300);
        }
    } catch (e: any) {
        debug.githubApiError = e.message;
    }

    // Test 2: getReader (uses patched fetch via middleware)
    try {
        const reader = getReader(token);
        debug.readerCreated = true;

        // Read settings
        const settings = await reader.singletons.settings.read();
        debug.settingsRead = !!settings;
        debug.siteTitle = settings?.siteTitle || '(empty)';

        // Read services
        const services = await reader.collections.services.all();
        debug.servicesCount = services.length;
        debug.servicesSlugs = services.map(s => s.slug);

        // Read blog
        const blog = await reader.collections.blog.all();
        debug.blogCount = blog.length;

        // Read team
        const team = await reader.collections.team.all();
        debug.teamCount = team.length;

    } catch (e: any) {
        debug.readerError = e.message;
        debug.readerStack = e.stack?.substring(0, 500);
    }

    return new Response(JSON.stringify(debug, null, 2), {
        headers: { 'Content-Type': 'application/json' },
    });
};
