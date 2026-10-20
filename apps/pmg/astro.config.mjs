// @ts-check
import { defineConfig, envField } from 'astro/config';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://playhousemedia.co.za',
  output: 'server',

  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL_UNPOOLED: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      PMG_RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: 'G-05TZ7T8ZGY',
      }),
    },
  },

  integrations: [
    partytown({ config: { forward: ['dataLayer.push'] } }),
    sitemap({
      customPages: ['https://playhousemedia.co.za/'],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
});
