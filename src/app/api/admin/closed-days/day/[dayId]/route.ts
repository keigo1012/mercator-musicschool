import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: RouteContext<"/api/admin/closed-days/day/[dayId]">) {
  try {
    await requireAdmin(request);
    const { dayId } = await context.params;
    await adminDb.collection("lessonClosedDays").doc(dayId).delete();
    return NextResponse.json({ id: dayId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "1日休業の解除に失敗しました。");
  }
}
