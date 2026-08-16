import type { ResendEmailPayload } from "./types";
import { getResendEnv } from "@/config/server-env";

const RESEND_API_URL = "https://api.resend.com/emails";
export const CONTACT_TO_EMAIL = "mercator.musicschool@gmail.com";
export const CONTACT_FROM_EMAIL = "contact@mercator-musicschool.com";

type ResendErrorResponse = { message?: string; name?: string };

export async function sendResendEmail(payload: ResendEmailPayload) {
  const { apiKey, fromEmail, fromName } = getResendEnv();
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, ...payload }),
    cache: "no-store",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as ResendErrorResponse | null;
    throw new Error(data?.message || "メール送信に失敗しました。");
  }
  return response.json().catch(() => ({}));
}
