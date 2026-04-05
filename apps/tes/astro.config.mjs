// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

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
   // maxDuration: 8,
 }),

  integrations: [react()],
});