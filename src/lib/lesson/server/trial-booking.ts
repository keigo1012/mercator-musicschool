import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { getInstrumentLabel, isDefaultClosedLessonHour } from "@/lib/lesson/constants";
import { isValidBirthDate, parseBookingRequest, validateLessonDeadline } from "@/lib/lesson/dates";
import { isEmailAddress } from "@/lib/lesson/validation";
import type { TrialBooking } from "@/lib/lesson/types";
import { assertInstrument, sha256Hex } from "@/lib/lesson/server-utils";
import { syncGoogleCalendar, writeCalendarSyncLog } from "./calendar";

export async function createTrialBooking(body: Record<string, unknown>) {
  const userName = String(body.userName ?? "").trim();
  const userPhoneNumber = String(body.userPhoneNumber ?? "").trim();
  const userEmail = String(body.userEmail ?? "").trim();
  const userBirthDate = String(body.userBirthDate ?? "").trim();
  const lessonFormat = body.lessonFormat === "online" ? "online" : "inPerson";
  const instrument = String(body.instrument ?? "");
  const date = String(body.date ?? "");
  const hour = Number(body.hour);
  const turnstileToken = String(body.turnstileToken ?? "");
  assertInstrument(instrument);

  if (!userName || !userPhoneNumber || !userEmail || !userBirthDate) {
    throw new Error("未入力の項目があります。");
  }
  if (!isValidBirthDate(userBirthDate)) {
    throw new Error("生年月日を正しく入力してください。");
  }
  if (!isEmailAddress(userEmail)) {
    throw new Error("メールアドレスが正しくありません。");
  }

  const slot = parseBookingRequest(date, hour);
  const deadlineError = validateLessonDeadline(slot.date);
  if (deadlineError) {
    throw new Error(deadlineError);
  }
  if (isDefaultClosedLessonHour(slot.hour)) {
    throw new Error("この時間は休業のため予約できません。");
  }

  const trialRef = adminDb.collection("trialBookings").doc(slot.bookingId);
  const verificationRef = adminDb.collection("turnstileVerifications").doc(await sha256Hex(turnstileToken));
  const lessonBookingRef = adminDb.collection("lessonBookings").doc(slot.bookingId);
  const dayClosedRef = adminDb.collection("lessonClosedDays").doc(slot.dayId);
  const slotClosedRef = adminDb.collection("lessonClosedDays").doc(slot.slotId);
  const booking: TrialBooking = {
    id: slot.bookingId,
    userName,
    userEmail,
    userPhoneNumber,
    userBirthDate,
    lessonFormat,
    instrument,
    date: slot.date,
    hour,
    startAt: slot.startAt,
    endAt: slot.endAt,
    googleCalendarEventId: "",
  };

  await adminDb.runTransaction(async (transaction) => {
    const [trialSnap, lessonBookingSnap, dayClosedSnap, slotClosedSnap, verificationSnap] = await Promise.all([
      transaction.get(trialRef),
      transaction.get(lessonBookingRef),
      transaction.get(dayClosedRef),
      transaction.get(slotClosedRef),
      transaction.get(verificationRef),
    ]);
    if (trialSnap.exists || lessonBookingSnap.exists) {
      throw new Error("この時間はすでに予約済みです。");
    }
    if (dayClosedSnap.exists || slotClosedSnap.exists) {
      throw new Error("この時間は休業のため予約できません。");
    }
    if (verificationSnap.exists) {
      throw new Error("このセキュリティ認証は使用済みです。認証をやり直してください。");
    }

    transaction.set(trialRef, {
      ...booking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(verificationRef, {
      id: verificationRef.id,
      bookingId: slot.bookingId,
      createdAt: serverTimestamp(),
    });
  });

  try {
    const calendar = await syncGoogleCalendar({
      action: "create",
      bookingId: slot.bookingId,
      userId: "trial",
      userName,
      userEmail,
      userPhoneNumber,
      instrument,
      instrumentLabel: `体験レッスン：${getInstrumentLabel(instrument)} / ${lessonFormat === "online" ? "オンライン" : "対面"}`,
      startAt: slot.startAt,
      endAt: slot.endAt,
      date: slot.date,
    });
    const googleCalendarEventId = calendar.googleCalendarEventId ?? "";
    await trialRef.update({ googleCalendarEventId, updatedAt: serverTimestamp() });
    await writeCalendarSyncLog({ bookingId: slot.bookingId, action: "create", status: "success", googleCalendarEventId });
    return { bookingId: slot.bookingId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Googleカレンダー連携に失敗しました。";
    await trialRef.delete();
    await writeCalendarSyncLog({ bookingId: slot.bookingId, action: "create", status: "failed", errorMessage: message });
    throw new Error(message);
  }
}
