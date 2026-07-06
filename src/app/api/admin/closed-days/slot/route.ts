import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { LESSON_HOURS } from "@/lib/lesson/constants";
import { isValidIsoDate } from "@/lib/lesson/dates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const date = String(body.date ?? "");
    const hour = Number(body.hour);
    if (!isValidIsoDate(date) || !LESSON_HOURS.includes(hour as (typeof LESSON_HOURS)[number])) throw new Error("日時が正しくありません。");
    const slotId = `${date.replaceAll("-", "")}${String(hour).padStart(2, "0")}`;
    await adminDb.collection("lessonClosedDays").doc(slotId).set({
      id: slotId,
      date,
      scope: "slot",
      hour,
      note: String(body.note ?? ""),
      createdAt: serverTimestamp(),
      createdBy: admin.id,
    });
    return NextResponse.json({ id: slotId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "時間休業の設定に失敗しました。");
  }
}
