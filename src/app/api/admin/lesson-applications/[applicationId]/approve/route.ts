import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import type { LessonApplication } from "@/lib/lesson/types";
import { isValidIsoDate } from "@/lib/lesson/dates";
import { countRemainingLessons, makeLessonTicket, monthlyLessonGrantMonthKey, todayTokyoDate } from "@/lib/lesson/tickets";
import { parseBoundedInteger } from "@/lib/lesson/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/lesson-applications/[applicationId]/approve">) {
  try {
    const admin = await requireAdmin(request);
    const { applicationId } = await context.params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const issueCount = parseBoundedInteger(body.issueCount, 0, 100);
    const monthlyLessonGrantCount = parseBoundedInteger(body.monthlyLessonGrantCount, 0, 20);
    const expiresOn = String(body.expiresOn ?? "").trim();
    if (issueCount === null) throw new Error("単発付与の回数が正しくありません。");
    if (monthlyLessonGrantCount === null) throw new Error("毎月自動付与の回数が正しくありません。");
    if (issueCount > 0 && (!isValidIsoDate(expiresOn) || expiresOn < todayTokyoDate())) {
      throw new Error("有効期限日が正しくありません。");
    }
    const appRef = adminDb.collection("lessonApplications").doc(applicationId);
    const lessonTickets = issueCount > 0 ? [makeLessonTicket({ count: issueCount, expiresOn, source: "admin" })] : [];

    await adminDb.runTransaction(async (transaction) => {
      const appSnap = await transaction.get(appRef);
      if (!appSnap.exists) throw new Error("申込が見つかりません。");
      const app = appSnap.data() as LessonApplication;
      if (app?.status !== "pending") throw new Error("処理済みの申込です。");
      const userRef = adminDb.collection("users").doc(app.userId);
      transaction.update(appRef, {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: admin.id,
      });
      transaction.update(userRef, {
        hasLessonPlan: true,
        lessonApplicationStatus: "approved",
        remainingLessons: countRemainingLessons(lessonTickets),
        monthlyLessonGrantCount,
        lastMonthlyLessonGrantMonth: monthlyLessonGrantMonthKey(),
        lessonTickets,
        lessonFullName: app.fullName,
        lessonBirthDate: app.birthDate,
        lessonMemberCount: app.memberCount,
        lessonMembers: app.members,
        lessonPostalCode: app.postalCode,
        lessonAddress: app.address,
        lessonPhoneNumber: app.phoneNumber,
        lessonEmail: app.email,
        phoneNumber: app.phoneNumber,
        updatedAt: serverTimestamp(),
      });
    });

    return NextResponse.json({ id: applicationId });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "承認に失敗しました。");
  }
}
