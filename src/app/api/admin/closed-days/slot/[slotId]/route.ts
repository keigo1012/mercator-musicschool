import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: RouteContext<"/api/admin/closed-days/slot/[slotId]">) {
  try {
    await requireAdmin(request);
    const { slotId } = await context.params;
    await adminDb.collection("lessonClosedDays").doc(slotId).delete();
    return NextResponse.json({ id: slotId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "時間休業の解除に失敗しました。");
  }
}
