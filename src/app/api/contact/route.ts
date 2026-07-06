import { NextResponse } from "next/server";
import { checkContactRateLimit } from "@/lib/cloudflare/rate-limit";
import { sendContactEmail } from "@/lib/contact/resend";
import { jsonError } from "@/lib/firebase/api";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";

export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = field(body.name);
    const email = field(body.email);
    const phone = field(body.phone);
    const message = field(body.message);
    const turnstileToken = field(body.turnstileToken);
    const turnstileIdempotencyKey = field(body.turnstileIdempotencyKey);

    if (!name || name.length > 80) {
      return jsonError("氏名を入力してください。");
    }
    if (!emailPattern.test(email) || email.length > 120) {
      return jsonError("メールアドレスを正しく入力してください。");
    }
    if (phone.length > 40) {
      return jsonError("電話番号は40文字以内で入力してください。");
    }
    if (!message || message.length > 2000) {
      return jsonError("お問い合わせ内容を2000文字以内で入力してください。");
    }
    if (!(await checkContactRateLimit(email || request.headers.get("cf-connecting-ip") || "missing-email"))) {
      return jsonError("短時間に多数の送信がありました。1分ほど待ってから再度お試しください。", 429);
    }
    if (!(await verifyTurnstileToken(turnstileToken, turnstileIdempotencyKey))) {
      return jsonError("セキュリティ認証に失敗しました。認証をやり直してください。", 403);
    }

    await sendContactEmail({ name, email, phone, message });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "お問い合わせの送信に失敗しました。", 500);
  }
}
