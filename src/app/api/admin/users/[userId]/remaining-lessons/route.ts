import { NextResponse } from "next/server";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { countRemainingLessons, makeLessonTicket, normalizeLessonTickets, todayTokyoDate } from "@/lib/lesson/tickets";
import type { LessonUser } from "@/lib/lesson/types";
import { isValidIsoDate } from "@/lib/lesson/dates";
import { parseBoundedInteger } from "@/lib/lesson/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext<"/api/admin/users/[userId]/remaining-lessons">) {
  try {
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    if (userId === admin.id) throw new Error("管理者本人は更新できません。");
    const body = await request.json() as Record<string, unknown>;
    const count = parseBoundedInteger(body.count, 1, 100);
    const expiresOn = String(body.expiresOn ?? "").trim();
    if (count === null) {
      throw new Error("発行回数が正しくありません。");
    }
    if (!isValidIsoDate(expiresOn) || expiresOn < todayTokyoDate()) {
      throw new Error("有効期限日が正しくありません。");
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("ユーザーが見つかりません。");
    const user = userSnap.data() as LessonUser;
    const lessonTickets = [
      ...normalizeLessonTickets({ lessonTickets: user.lessonTickets }),
      makeLessonTicket({ count, expiresOn, source: "admin" }),
    ].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.issuedOn.localeCompare(b.issuedOn));

    await userRef.update({
      lessonTickets,
      remainingLessons: countRemainingLessons(lessonTickets),
      updatedAt: serverTimestamp(),
    });
    return NextResponse.json({ userId, remainingLessons: countRemainingLessons(lessonTickets), lessonTickets });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "回数券発行に失敗しました。");
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/admin/users/[userId]/remaining-lessons">) {
  try {
    const admin = await requireAdmin(request);
    const { userId } = await context.params;
    if (userId === admin.id) throw new Error("管理者本人は更新できません。");
    const ticketId = new URL(request.url).searchParams.get("ticketId") ?? "";
    if (!ticketId) throw new Error("削除する回数券を選択してください。");

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new Error("ユーザーが見つかりません。");
    const user = userSnap.data() as LessonUser;
    const currentTickets = normalizeLessonTickets({ lessonTickets: user.lessonTickets });
    const lessonTickets = currentTickets.filter((ticket) => ticket.id !== ticketId);
    if (lessonTickets.length === currentTickets.length) {
      throw new Error("回数券が見つかりません。");
    }

    await userRef.update({
      lessonTickets,
      remainingLessons: countRemainingLessons(lessonTickets),
      updatedAt: serverTimestamp(),
    });
    return NextResponse.json({ userId, remainingLessons: countRemainingLessons(lessonTickets), lessonTickets });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "回数券削除に失敗しました。");
  }
}
