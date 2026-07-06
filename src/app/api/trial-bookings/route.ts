import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError } from "@/lib/firebase/api";
import { sendTrialBookingEmail } from "@/lib/contact/resend";
import { createTrialBooking } from "@/lib/lesson/server";
import { getInstrumentLabel } from "@/lib/lesson/constants";
import { formatDateJa, getJapaneseSchoolGrade, isValidBirthDate, pad2, toTokyoParts } from "@/lib/lesson/dates";
import { checkTrialBookingRateLimit } from "@/lib/cloudflare/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";

export const dynamic = "force-dynamic";

function formatBirthDateWithAgeAndGrade(birthDate: string) {
  if (!isValidBirthDate(birthDate)) return birthDate;
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const current = toTokyoParts();
  const hasBirthdayPassed = current.month > birthMonth || (current.month === birthMonth && current.day >= birthDay);
  const age = current.year - birthYear - (hasBirthdayPassed ? 0 : 1);
  const grade = getJapaneseSchoolGrade(birthDate);
  return `${birthDate} (${age}歳${grade ? `・${grade}` : ""})`;
}

function lessonFormatLabel(value: unknown) {
  return value === "online" ? "オンライン" : "対面";
}

export async function GET() {
  try {
    const [lessonBookingsSnap, trialBookingsSnap, closedDaysSnap] = await Promise.all([
      adminDb.collection("lessonBookings").get(),
      adminDb.collection("trialBookings").get(),
      adminDb.collection("lessonClosedDays").get(),
    ]);
    const bookedSlotIds = [
      ...lessonBookingsSnap.docs.map((doc) => doc.id),
      ...trialBookingsSnap.docs.map((doc) => doc.id),
    ];
    const closedDays = closedDaysSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: String(data.date ?? ""),
        scope: data.scope === "day" ? "day" : "slot",
      };
    });

    return NextResponse.json({ bookedSlotIds, closedDays });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約枠の取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const email = String(body.userEmail ?? "").trim();
    if (!(await checkTrialBookingRateLimit(email || "missing-email"))) {
      return jsonError("短時間に多数の申込がありました。1分ほど待ってから再度お試しください。", 429);
    }
    const turnstileToken = String(body.turnstileToken ?? "");
    const turnstileIdempotencyKey = String(body.turnstileIdempotencyKey ?? "");
    if (!(await verifyTurnstileToken(turnstileToken, turnstileIdempotencyKey))) {
      return jsonError("セキュリティ認証に失敗しました。認証をやり直してください。", 403);
    }
    const result = await createTrialBooking(body);
    const hour = Number(body.hour);
    try {
      await sendTrialBookingEmail({
        userName: String(body.userName ?? "").trim(),
        userEmail: email,
        userPhoneNumber: String(body.userPhoneNumber ?? "").trim(),
        userBirthDate: String(body.userBirthDate ?? "").trim(),
        userBirthDateLabel: formatBirthDateWithAgeAndGrade(String(body.userBirthDate ?? "").trim()),
        lessonFormatLabel: lessonFormatLabel(body.lessonFormat),
        instrumentLabel: getInstrumentLabel(String(body.instrument ?? "")),
        dateLabel: formatDateJa(String(body.date ?? "")),
        startTime: `${pad2(hour)}:00`,
        endTime: `${pad2(hour + 1)}:00`,
      });
    } catch (emailError) {
      console.error("Failed to send trial booking email", emailError);
      return NextResponse.json({ ...result, emailWarning: "予約は完了しましたが、確認メールの送信に失敗しました。" });
    }
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "無料体験レッスン予約に失敗しました。");
  }
}
