import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: RouteContext<"/api/admin/users/[userId]">) {
  try {
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    if (userId === admin.id) throw new Error("管理者本人は退会できません。");

    const userRef = adminDb.collection("users").doc(userId);
    const target = await userRef.get();
    if (!target.exists) throw new Error("対象ユーザーが見つかりません。");
    if (target.data().isAdmin) throw new Error("管理者アカウントは退会できません。");

    const applicationSnap = await adminDb.collection("lessonApplications").where("userId", "==", userId).get();
    await adminAuth.deleteUser(userId);
    await adminDb.commit([
      ...applicationSnap.docs.map((doc) => ({ delete: doc.ref.name })),
      { delete: userRef.name },
    ]);

    return NextResponse.json({ userId, deleted: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退会処理に失敗しました。", 400);
  }
}
