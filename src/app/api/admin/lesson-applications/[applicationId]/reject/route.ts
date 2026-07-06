import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import type { LessonApplication } from "@/lib/lesson/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/lesson-applications/[applicationId]/reject">) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await context.params;
    const appRef = adminDb.collection("lessonApplications").doc(applicationId);

    await adminDb.runTransaction(async (transaction) => {
      const appSnap = await transaction.get(appRef);
      if (!appSnap.exists) throw new Error("申込が見つかりません。");
      const app = appSnap.data() as LessonApplication;
      if (app?.status !== "pending") throw new Error("処理済みの申込です。");
      transaction.update(appRef, {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: admin.id,
      });
      transaction.update(adminDb.collection("users").doc(app.userId), {
        lessonApplicationStatus: "rejected",
        updatedAt: serverTimestamp(),
      });
    });

    return NextResponse.json({ id: applicationId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "却下に失敗しました。");
  }
}
