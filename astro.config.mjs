// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import keystatic from '@keystatic/astro';

/**
 * Keystatic entegrasyonunu sarmalayan wrapper.
 * Keystatic otomatik olarak /api/keystatic/[...params] route'u enjekte eder,
 * ama biz bu route'u zaten custom proxy ile handle ediyoruz (GITHUB_TOKEN enjeksiyonu için).
 * Bu wrapper, API route enjeksiyonunu atlayarak çakışmayı (route collision) önler.
 */
function keystaticNoApiRoute() {
  const original = keystatic();
  return {
    ...original,
    hooks: {
      'astro:config:setup': (options) => {
        const originalInjectRoute = options.injectRoute;
        options.injectRoute = (route) => {
          // API route'unu atla — biz bunu src/pages/api/keystatic/[...params].ts ile yönetiyoruz
          if (route.pattern === '/api/keystatic/[...params]') return;
          originalInjectRoute(route);
        };
        original.hooks['astro:config:setup'](options);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'server',

  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  integrations: [
    react(),
    keystaticNoApiRoute(),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        'react-dom/server': 'react-dom/server.edge',
      },
    },
  },
});