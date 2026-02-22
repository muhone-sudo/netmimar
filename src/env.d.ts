/// <reference path="../.astro/types.d.ts" />

type D1Database = import('@cloudflare/workers-types').D1Database;

interface CloudflareEnv {
    GITHUB_TOKEN: string;
    REPO_OWNER: string;
    REPO_NAME: string;
    PUBLIC_REPO_OWNER: string;
    PUBLIC_REPO_NAME: string;
    PUBLIC_SITE_URL: string;
    CLIENT_EMAIL: string;
    CLIENT_PASSWORD: string;
    COOKIE_SECRET: string;
    RESEND_API_KEY: string;
    DB: D1Database;
}

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
    interface Locals extends Runtime { }
}
