// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://apexwebsolutions.co.za',
  output: 'server',

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