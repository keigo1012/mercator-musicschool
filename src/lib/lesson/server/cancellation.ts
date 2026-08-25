import { adminDb, serializeFirestore, serverTimestamp } from "@/lib/firebase/admin";
import { validateLessonDeadline } from "@/lib/lesson/dates";
import type { LessonBooking, LessonUser, TrialBooking } from "@/lib/lesson/types";
import { countRemainingLessons, normalizeLessonTickets, restoreLessonTicket, todayTokyoDate } from "@/lib/lesson/tickets";
import { syncGoogleCalendar, writeCalendarSyncLog } from "./calendar";

export async function cancelLessonBooking(bookingId: string, requesterUid: string, options: { admin?: boolean } = {}) {
  const bookingRef = adminDb.collection("lessonBookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) {
    if (options.admin) {
      const trialRef = adminDb.collection("trialBookings").doc(bookingId);
      const trialSnap = await trialRef.get();
      if (trialSnap.exists) {
        const trial = serializeFirestore(trialSnap.data()) as TrialBooking;
        if (trial.googleCalendarEventId) {
          await syncGoogleCalendar({
            action: "delete",
            bookingId,
            googleCalendarEventId: trial.googleCalendarEventId,
          });
          await writeCalendarSyncLog({ bookingId, action: "delete", status: "success", googleCalendarEventId: trial.googleCalendarEventId });
        }
        await trialRef.delete();
        return { bookingId };
      }
    }
    throw new Error("予約が見つかりません。");
  }
  const booking = serializeFirestore(bookingSnap.data()) as LessonBooking;
  if (!options.admin && booking.userId !== requesterUid) {
    throw new Error("自分の予約のみキャンセルできます。");
  }
  if (!options.admin && (booking.adminOnlyCancellation || booking.lessonKind === "adminAssigned")) {
    throw new Error("このレッスンは管理者のみ取り消せます。");
  }
  const deadlineError = validateLessonDeadline(booking.date);
  if (!options.admin && deadlineError) {
    throw new Error(deadlineError);
  }

  if (booking.googleCalendarEventId) {
    await syncGoogleCalendar({
      action: "delete",
      bookingId,
      googleCalendarEventId: booking.googleCalendarEventId,
    });
    await writeCalendarSyncLog({ bookingId, action: "delete", status: "success", googleCalendarEventId: booking.googleCalendarEventId });
  }

  const userRef = adminDb.collection("users").doc(booking.userId);
  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const current = userSnap.data() as LessonUser | undefined;
    const currentTickets = normalizeLessonTickets({ lessonTickets: current?.lessonTickets });
    const restoredTickets = restoreLessonTicket(
      currentTickets,
      booking.lessonTicketId && booking.lessonTicketIssuedOn && booking.lessonTicketExpiresOn && booking.lessonTicketSource
        ? {
            id: booking.lessonTicketId,
            count: 1,
            issuedOn: booking.lessonTicketIssuedOn,
            expiresOn: booking.lessonTicketExpiresOn,
            source: booking.lessonTicketSource,
          }
        : null,
      todayTokyoDate(),
    );
    transaction.delete(bookingRef);
    transaction.update(userRef, {
      remainingLessons: countRemainingLessons(restoredTickets),
      lessonTickets: restoredTickets,
      updatedAt: serverTimestamp(),
    });
  });

  return { bookingId };
}
