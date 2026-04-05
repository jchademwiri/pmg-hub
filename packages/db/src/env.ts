import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
});

export function getEnv() {
  const parsedEnv = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  });

  if (!parsedEnv.success) {
    console.error("❌ Invalid database environment variables:", parsedEnv.error.flatten().fieldErrors);
    throw new Error("Invalid database environment variables");
  }

  return parsedEnv.data;
}
