import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { DEFAULT_INSTRUMENT, INSTRUMENTS } from "@/lib/lesson/constants";
import { parseBookingRequest } from "@/lib/lesson/dates";
import type { BookedLesson, LessonUser } from "@/lib/lesson/types";
import { consumeOneLessonTicket, countRemainingLessons, normalizeLessonTickets, todayTokyoDate } from "@/lib/lesson/tickets";

export type AdminAssignmentTarget = {
  userId: string;
  memberIndex: number;
};

type AdminAssignmentResult = AdminAssignmentTarget & {
  memberName?: string;
  bookingId?: string;
  error?: string;
};

function normalizedTitle(value: unknown) {
  const title = String(value ?? "").trim();
  if (!title) throw new Error("レッスン名を入力してください。");
  if (title.length > 60) throw new Error("レッスン名は60文字以内で入力してください。");
  return title;
}

function normalizedTargets(value: unknown) {
  if (!Array.isArray(value) || !value.length) throw new Error("対象会員を選択してください。");
  if (value.length > 100) throw new Error("一度に付与できるのは100名までです。");

  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("対象会員が正しくありません。");
    const target = item as Partial<AdminAssignmentTarget>;
    const userId = String(target.userId ?? "").trim();
    const memberIndex = Number(target.memberIndex);
    const key = `${userId}:${memberIndex}`;
    if (!userId || !Number.isInteger(memberIndex) || memberIndex < 0 || memberIndex > 9 || seen.has(key)) {
      throw new Error("対象会員が正しくありません。");
    }
    seen.add(key);
    return { userId, memberIndex };
  });
}

export async function createAdminAssignedLessons(adminId: string, body: Record<string, unknown>) {
  const lessonTitle = normalizedTitle(body.lessonTitle);
  const date = String(body.date ?? "");
  const hour = Number(body.hour);
  const slot = parseBookingRequest(date, hour);
  if (slot.date < todayTokyoDate()) throw new Error("過去の日付には付与できません。");
  const targets = normalizedTargets(body.targets);
  const assignmentGroupId = crypto.randomUUID().replaceAll("-", "");
  const results: AdminAssignmentResult[] = [];

  for (const target of targets) {
    try {
      const bookingId = `assigned-${assignmentGroupId}-${target.userId}-${target.memberIndex}`;
      const bookingRef = adminDb.collection("lessonBookings").doc(bookingId);
      const userRef = adminDb.collection("users").doc(target.userId);

      const memberName = await adminDb.runTransaction(async (transaction) => {
        const [userSnap, bookingSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(bookingRef),
        ]);
        if (!userSnap.exists) throw new Error("ユーザーが見つかりません。");
        if (bookingSnap.exists) throw new Error("同じ付与予約がすでに存在します。");

        const user = userSnap.data() as LessonUser;
        if (user.isBlockedByAdmin) throw new Error("休会中です。");
        if (!user.hasLessonPlan || user.lessonApplicationStatus !== "approved") throw new Error("承認済み会員ではありません。");

        const members = Array.isArray(user.lessonMembers) && user.lessonMembers.length
          ? user.lessonMembers
          : [{ name: user.lessonFullName || user.name || "レッスン会員", birthDate: user.lessonBirthDate || "" }];
        const member = members[target.memberIndex];
        if (!member?.name) throw new Error("対象の受講者が見つかりません。");

        const activeTickets = normalizeLessonTickets({ lessonTickets: user.lessonTickets });
        const consumed = consumeOneLessonTicket(activeTickets);
        if (!consumed.consumed) throw new Error("残りレッスン回数がありません。");

        const nowIso = new Date().toISOString();
        const instrument = INSTRUMENTS.some((item) => item.id === user.selectedLessonInstrument)
          ? user.selectedLessonInstrument
          : DEFAULT_INSTRUMENT;
        const bookedLesson: BookedLesson = {
          id: bookingId,
          userId: target.userId,
          lessonKind: "adminAssigned",
          lessonTitle,
          assignmentGroupId,
          assignedBy: adminId,
          adminOnlyCancellation: true,
          memberName: member.name,
          instrument,
          date: slot.date,
          startAt: slot.startAt,
          endAt: slot.endAt,
          lessonTicketId: consumed.consumed.id,
          lessonTicketIssuedOn: consumed.consumed.issuedOn,
          lessonTicketExpiresOn: consumed.consumed.expiresOn,
          lessonTicketSource: consumed.consumed.source,
          createdAt: nowIso,
        };

        transaction.set(bookingRef, {
          ...bookedLesson,
          userName: member.name,
          userEmail: user.lessonEmail || user.email || "",
          userPhoneNumber: user.lessonPhoneNumber || user.phoneNumber || "",
          googleCalendarEventId: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.update(userRef, {
          remainingLessons: countRemainingLessons(consumed.next),
          lessonTickets: consumed.next,
          updatedAt: serverTimestamp(),
        });
        return member.name;
      });

      results.push({ ...target, memberName, bookingId });
    } catch (error) {
      results.push({ ...target, error: error instanceof Error ? error.message : "付与に失敗しました。" });
    }
  }

  return {
    assignmentGroupId,
    lessonTitle,
    date,
    hour,
    succeeded: results.filter((result) => result.bookingId),
    failed: results.filter((result) => result.error),
  };
}
