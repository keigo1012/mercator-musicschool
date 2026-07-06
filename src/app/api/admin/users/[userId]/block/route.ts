import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/users/[userId]/block">) {
  try {
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    if (userId === admin.id) throw new Error("管理者本人は休会にできません。");
    const target = await adminDb.collection("users").doc(userId).get();
    if (target.data()?.isAdmin) throw new Error("管理者アカウントは休会にできません。");
    const body = await request.json() as Record<string, unknown>;
    const isBlockedByAdmin = Boolean(body.isBlockedByAdmin);
    await target.ref.update({ isBlockedByAdmin, updatedAt: serverTimestamp() });
    return NextResponse.json({ userId, isBlockedByAdmin });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "休会状態の更新に失敗しました。");
  }
}
