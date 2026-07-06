import { TURNSTILE_VERIFY_URL } from "@/lib/turnstile/config";

type TurnstileVerification = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

const allowedHostnames = new Set([
  "www.mercator-musicschool.com",
  "mercator-musicschool.com",
  "localhost",
  "127.0.0.1",
]);

export async function verifyTurnstileToken(token: string, idempotencyKey: string) {
  if (!token || !idempotencyKey) return false;

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, idempotency_key: idempotencyKey }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as TurnstileVerification | null;

  return Boolean(
    response.ok
      && result?.success
      && result.action === "turnstile-spin-v1"
      && result.hostname
      && allowedHostnames.has(result.hostname),
  );
}
