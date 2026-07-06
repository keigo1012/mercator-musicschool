import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { isValidIsoDate } from "@/lib/lesson/dates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const date = String(body.date ?? "");
    if (!isValidIsoDate(date)) throw new Error("日付が正しくありません。");
    const dayId = date.replaceAll("-", "");
    await adminDb.collection("lessonClosedDays").doc(dayId).set({
      id: dayId,
      date,
      scope: "day",
      hour: null,
      note: String(body.note ?? ""),
      createdAt: serverTimestamp(),
      createdBy: admin.id,
    });
    return NextResponse.json({ id: dayId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "1日休業の設定に失敗しました。");
  }
}
