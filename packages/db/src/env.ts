import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
});

export function getEnv() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DATABASE_URL);
  const databaseUrlUnpooled =
    process.env.DATABASE_URL_UNPOOLED ||
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DATABASE_URL_UNPOOLED);

  const parsedEnv = envSchema.safeParse({
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: databaseUrlUnpooled,
  });

  if (!parsedEnv.success) {
    console.error(
      '❌ Invalid database environment variables:',
      parsedEnv.error.flatten().fieldErrors,
    );
    throw new Error('Invalid database environment variables');
  }

  return parsedEnv.data;
}

/** Bridge Astro import.meta.env values into process.env for getDb(). */
export function bridgeDatabaseEnv(env: Record<string, string | undefined>) {
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL_UNPOOLED = env.DATABASE_URL_UNPOOLED;
  }
}
