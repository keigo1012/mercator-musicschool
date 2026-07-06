import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function checkTrialBookingRateLimit(key: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const limiter = env.TRIAL_BOOKING_RATE_LIMITER;
    if (!limiter) return true;
    const result = await limiter.limit({ key: `trial-booking:${key.toLowerCase()}` });
    return result.success;
  } catch {
    // The binding is unavailable during the regular Next.js local development server.
    return true;
  }
}

export async function checkContactRateLimit(key: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const limiter = env.TRIAL_BOOKING_RATE_LIMITER;
    if (!limiter) return true;
    const result = await limiter.limit({ key: `contact:${key.toLowerCase()}` });
    return result.success;
  } catch {
    // The binding is unavailable during the regular Next.js local development server.
    return true;
  }
}
