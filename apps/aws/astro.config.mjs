// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://apexwebsolutions.co.za',
  output: 'server',

  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      DATABASE_URL_UNPOOLED: envField.string({ context: 'server', access: 'secret', optional: true }),
      AWS_RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      AWS_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'noreply@info.apexwebsolutions.co.za',
      }),
      AWS_ADMIN_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'info@apexwebsolutions.co.za',
      }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  integrations: [
    react(),
    partytown({ config: { forward: ['dataLayer.push'] } }),
    sitemap({
      customPages: ['https://apexwebsolutions.co.za/'],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
});