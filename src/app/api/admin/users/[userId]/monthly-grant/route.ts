import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { monthlyLessonGrantMonthKey } from "@/lib/lesson/tickets";
import { parseBoundedInteger } from "@/lib/lesson/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[userId]/monthly-grant">) {
  try {
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    if (userId === admin.id) throw new Error("管理者本人は更新できません。");
    const body = await request.json() as Record<string, unknown>;
    const monthlyLessonGrantCount = parseBoundedInteger(body.monthlyLessonGrantCount, 0, 20);
    if (monthlyLessonGrantCount === null) throw new Error("毎月付与回数が正しくありません。");
    await adminDb.collection("users").doc(userId).update({ monthlyLessonGrantCount, lastMonthlyLessonGrantMonth: monthlyLessonGrantMonthKey(), updatedAt: serverTimestamp() });
    return NextResponse.json({ userId, monthlyLessonGrantCount });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "毎月付与回数更新に失敗しました。");
  }
}
