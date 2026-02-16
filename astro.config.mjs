// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  // Cloudflare adapter otomatik KV session eklemesin diye driver belirtiyoruz.
  // Projede session kullanılmıyor (auth cookie/HMAC ile yapılıyor).
  session: {
    driver: 'fs-lite',
  },

  integrations: [
    react(),
    keystatic(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});