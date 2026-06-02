// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site: 'https://www.tenderedgesolutions.co.za',

  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL_UNPOOLED: envField.string({ context: 'server', access: 'secret', optional: true }),
      TES_RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TES_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'noreply@info.tenderedgesolutions.co.za',
      }),
      TES_ADMIN_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'tenders@tenderedgesolutions.co.za',
      }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel({
   webAnalytics: {
     enabled: true,
   },
 }),

  integrations: [
    react(),
    sitemap({
      // index.astro is SSR so it won't be auto-discovered - add it manually
      customPages: ['https://www.tenderedgesolutions.co.za/'],
    }),
  ],
});