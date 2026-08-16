import { adminDb, FieldValue, serverTimestamp } from "@/lib/firebase/admin";
import { getInstrumentLabel, isDefaultClosedLessonHour } from "@/lib/lesson/constants";
import { parseBookingRequest, validateLessonDeadline } from "@/lib/lesson/dates";
import type { BookedLesson, LessonBooking, LessonUser } from "@/lib/lesson/types";
import { consumeOneLessonTicket, countRemainingLessons, normalizeLessonTickets } from "@/lib/lesson/tickets";
import { updateArrayWithoutBooking } from "@/lib/lesson/bookings";
import { assertInstrument } from "@/lib/lesson/server-utils";
import { syncGoogleCalendar, writeCalendarSyncLog } from "./calendar";

export async function createLessonBooking(uid: string, body: Record<string, unknown>) {
  const instrument = String(body.instrument ?? "");
  const lessonFormat = body.lessonFormat === "online" ? "online" : "inPerson";
  const date = String(body.date ?? "");
  const hour = Number(body.hour);
  const memberName = String(body.memberName ?? "").trim();
  assertInstrument(instrument);

  const slot = parseBookingRequest(date, hour);
  const deadlineError = validateLessonDeadline(slot.date);
  if (deadlineError) {
    throw new Error(deadlineError);
  }
  if (isDefaultClosedLessonHour(slot.hour)) {
    throw new Error("この時間は休業のため予約できません。");
  }

  const bookingRef = adminDb.collection("lessonBookings").doc(slot.bookingId);
  const trialRef = adminDb.collection("trialBookings").doc(slot.bookingId);
  const userRef = adminDb.collection("users").doc(uid);
  const dayClosedRef = adminDb.collection("lessonClosedDays").doc(slot.dayId);
  const slotClosedRef = adminDb.collection("lessonClosedDays").doc(slot.slotId);

  const { calendarBase, bookedLesson, ticketsBeforeBooking } = await adminDb.runTransaction(async (transaction) => {
    const [userSnap, bookingSnap, trialSnap, dayClosedSnap, slotClosedSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(bookingRef),
      transaction.get(trialRef),
      transaction.get(dayClosedRef),
      transaction.get(slotClosedRef),
    ]);
    if (!userSnap.exists) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    if (bookingSnap.exists || trialSnap.exists) {
      throw new Error("この時間はすでに予約済みです。");
    }
    if (dayClosedSnap.exists || slotClosedSnap.exists) {
      throw new Error("この時間は休業のため予約できません。");
    }
    const user = userSnap.data() as LessonUser;
    if (user.isBlockedByAdmin) throw new Error("現在このアカウントは休会中です。");
    if (!user.hasLessonPlan || user.lessonApplicationStatus !== "approved") throw new Error("承認済みユーザーのみ予約できます。");
    const activeTickets = normalizeLessonTickets({ lessonTickets: user.lessonTickets });
    const remainingLessons = countRemainingLessons(activeTickets);
    if (remainingLessons <= 0) throw new Error("残りレッスン回数がありません。");
    const consumed = consumeOneLessonTicket(activeTickets);
    if (!consumed.consumed) throw new Error("残りレッスン回数がありません。");

    const nowIso = new Date().toISOString();
    const selectableMembers = Array.isArray(user.lessonMembers) ? user.lessonMembers : [];
    const selectedMember = selectableMembers.length >= 2
      ? selectableMembers.find((member) => member.name === memberName)
      : selectableMembers[0];
    if (selectableMembers.length >= 2 && !selectedMember) {
      throw new Error("予約する会員名を選択してください。");
    }
    const userName = selectedMember?.name || user.lessonFullName || user.name || "レッスン会員";
    const userEmail = user.lessonEmail || user.email || "";
    const userPhoneNumber = user.lessonPhoneNumber || user.phoneNumber || "";
    const bookedLesson: BookedLesson = {
      id: slot.bookingId,
      userId: uid,
      memberName: selectedMember?.name,
      instrument,
      lessonFormat,
      date: slot.date,
      startAt: slot.startAt,
      endAt: slot.endAt,
      lessonTicketId: consumed.consumed.id,
      lessonTicketIssuedOn: consumed.consumed.issuedOn,
      lessonTicketExpiresOn: consumed.consumed.expiresOn,
      lessonTicketSource: consumed.consumed.source,
      createdAt: nowIso,
    };
    const calendarBase: LessonBooking = {
      ...bookedLesson,
      userName,
      userEmail,
      userPhoneNumber,
    };
    transaction.set(bookingRef, {
      ...calendarBase,
      googleCalendarEventId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(userRef, {
      remainingLessons: countRemainingLessons(consumed.next),
      lessonTickets: consumed.next,
      bookedLessons: FieldValue.arrayUnion(bookedLesson),
      bookedLessonDates: FieldValue.arrayUnion(slot.date),
      selectedLessonInstrument: instrument,
      updatedAt: serverTimestamp(),
    });
    return { calendarBase, bookedLesson, ticketsBeforeBooking: activeTickets };
  });

  try {
    const calendar = await syncGoogleCalendar({
      action: "create",
      bookingId: slot.bookingId,
      userId: uid,
      userName: calendarBase.userName,
      userEmail: calendarBase.userEmail,
      userPhoneNumber: calendarBase.userPhoneNumber,
      instrument,
      instrumentLabel: `${getInstrumentLabel(instrument)} / ${lessonFormat === "online" ? "オンライン" : "対面"}`,
      startAt: slot.startAt,
      endAt: slot.endAt,
      date: slot.date,
    });
    const googleCalendarEventId = calendar.googleCalendarEventId ?? "";
    await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const current = userSnap.data() as LessonUser | undefined;
      const nextLessons = updateArrayWithoutBooking(current?.bookedLessons, slot.bookingId);
      transaction.update(bookingRef, { googleCalendarEventId, updatedAt: serverTimestamp() });
      transaction.update(userRef, {
        bookedLessons: [...nextLessons, { ...bookedLesson, googleCalendarEventId }],
        updatedAt: serverTimestamp(),
      });
    });
    await writeCalendarSyncLog({ bookingId: slot.bookingId, action: "create", status: "success", googleCalendarEventId });
    return { bookingId: slot.bookingId, googleCalendarEventId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Googleカレンダー連携に失敗しました。";
    await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const current = userSnap.data() as LessonUser | undefined;
      transaction.delete(bookingRef);
      transaction.update(userRef, {
        remainingLessons: countRemainingLessons(ticketsBeforeBooking),
        lessonTickets: ticketsBeforeBooking,
        bookedLessons: updateArrayWithoutBooking(current?.bookedLessons, slot.bookingId),
        bookedLessonDates: updateArrayWithoutBooking(current?.bookedLessons, slot.bookingId).map((item: BookedLesson) => item.date),
        updatedAt: serverTimestamp(),
      });
    });
    await writeCalendarSyncLog({ bookingId: slot.bookingId, action: "create", status: "failed", errorMessage: message });
    throw new Error(message);
  }
}
