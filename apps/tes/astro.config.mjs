// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  site: 'https://www.tenderedgesolutions.co.za',

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
      // index.astro is SSR so it won't be auto-discovered — add it manually
      customPages: ['https://www.tenderedgesolutions.co.za/'],
    }),
  ],
});