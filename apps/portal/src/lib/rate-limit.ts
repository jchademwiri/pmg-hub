import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Resolves the client's IP address from request headers.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const xff = headersList.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return headersList.get("x-real-ip") || "127.0.0.1";
}

/**
 * Checks the rate limit for a given identifier (e.g., IP address + action name).
 * Falls back to allowing the request if Upstash is not configured.
 */
export async function checkRateLimit(
  identifier: string,
  limit = 5,
  window: Duration = "60 s"
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (!redis) {
    return { success: true, limit, remaining: limit, reset: Date.now() };
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });

  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
