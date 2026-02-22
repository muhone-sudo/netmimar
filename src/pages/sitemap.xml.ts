import type { APIRoute } from 'astro';
import { getReader } from '../lib/reader';

export const prerender = true;

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
    const siteUrl = (import.meta.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');

    const reader = getReader();
    const [services, projects, posts] = await Promise.all([
        reader.collections.services.all(),
        reader.collections.projects.all(),
        reader.collections.blog.all(),
    ]);

    const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'weekly' },
        { url: '/hizmetler', priority: '0.8', changefreq: 'weekly' },
        { url: '/projeler', priority: '0.8', changefreq: 'weekly' },
        { url: '/blog', priority: '0.8', changefreq: 'daily' },
        { url: '/ekip', priority: '0.6', changefreq: 'monthly' },
        { url: '/siteharitasi', priority: '0.3', changefreq: 'monthly' },
    ];

    const dynamicPages = [
        ...services.map((s) => ({
            url: `/hizmetler/${s.slug}`,
            priority: '0.7',
            changefreq: 'monthly',
        })),
        ...projects.map((p) => ({
            url: `/projeler/${p.slug}`,
            priority: '0.7',
            changefreq: 'monthly',
        })),
        ...posts.map((p) => ({
            url: `/blog/${p.slug}`,
            priority: '0.6',
            changefreq: 'weekly',
        })),
    ];

    const allPages = [...staticPages, ...dynamicPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
        .map(
            (p) => `  <url>
    <loc>${escapeXml(`${siteUrl}${p.url}`)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
        )
        .join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
