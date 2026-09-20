import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    author: z.string().default('TenderEdge Team'),
    draft: z.boolean().default(false),
    coverImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    canonicalUrl: z.string().url().optional(),
  }),
});

export const collections = { blog };
