/// <reference path="../.astro/types.d.ts" />

type D1Database = import('@cloudflare/workers-types').D1Database;

interface CloudflareEnv {
    GITHUB_TOKEN: string;
    REPO_OWNER: string;
    REPO_NAME: string;
    CLIENT_EMAIL: string;
    CLIENT_PASSWORD: string;
    COOKIE_SECRET: string;
    DB: D1Database;
}

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
    interface Locals extends Runtime { }
}
