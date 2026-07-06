import { createSign } from "node:crypto";
import { adminDb, FieldValue, serializeFirestore, serverTimestamp } from "@/lib/firebase/admin";
import { getInstrumentLabel, INSTRUMENTS, isDefaultClosedLessonHour } from "@/lib/lesson/constants";
import { isValidBirthDate, parseBookingRequest, validateLessonDeadline } from "@/lib/lesson/dates";
import { isEmailAddress, parseBoundedInteger } from "@/lib/lesson/validation";
import type { BookedLesson, LessonBooking, LessonUser, TrialBooking } from "@/lib/lesson/types";
import { updateArrayWithoutBooking } from "@/lib/firebase/api";
import { consumeOneLessonTicket, countRemainingLessons, normalizeLessonTickets, restoreLessonTicket, todayTokyoDate } from "@/lib/lesson/tickets";

type CalendarPayload =
  | {
      action: "create";
      bookingId: string;
      userId: string;
      userName: string;
      userEmail: string;
      userPhoneNumber: string;
      instrument: string;
      instrumentLabel: string;
      startAt: string;
      endAt: string;
      date: string;
    }
  | {
      action: "delete";
      bookingId: string;
      googleCalendarEventId: string;
    };

let calendarAccessToken: { token: string; expiresAt: number } | null = null;

function assertInstrument(instrument: string) {
  if (!INSTRUMENTS.some((item) => item.id === instrument)) {
    throw new Error("楽器の選択が正しくありません。");
  }
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getGoogleCalendarCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !privateKey || !calendarId) {
    throw new Error("Google Calendar API連携の環境変数が未設定です。");
  }

  return { clientEmail, privateKey, calendarId };
}

async function getGoogleCalendarAccessToken() {
  if (calendarAccessToken && calendarAccessToken.expiresAt > Date.now() + 60_000) {
    return calendarAccessToken.token;
  }

  const { clientEmail, privateKey } = getGoogleCalendarCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsignedJwt).sign(privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string; error_description?: string } | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Google Calendar APIの認証に失敗しました。");
  }

  calendarAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return calendarAccessToken.token;
}

async function googleCalendarFetch(path: string, init: RequestInit = {}) {
  const token = await getGoogleCalendarAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const error = data.error as { message?: string } | undefined;
    throw new Error(error?.message || "Google Calendar API連携に失敗しました。");
  }

  return data;
}

export async function syncGoogleCalendar(payload: CalendarPayload) {
  const { calendarId } = getGoogleCalendarCredentials();
  const encodedCalendarId = encodeURIComponent(calendarId);

  if (payload.action === "delete") {
    await googleCalendarFetch(`/calendars/${encodedCalendarId}/events/${encodeURIComponent(payload.googleCalendarEventId)}`, {
      method: "DELETE",
    });
    return { success: true };
  }

  const data = await googleCalendarFetch(`/calendars/${encodedCalendarId}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: payload.userName,
      location: payload.instrumentLabel,
      description: [
        `予約ID: ${payload.bookingId}`,
        `楽器: ${payload.instrumentLabel}`,
        `氏名: ${payload.userName}`,
        `メール: ${payload.userEmail}`,
        `電話番号: ${payload.userPhoneNumber}`,
      ].join("\n"),
      start: {
        dateTime: payload.startAt,
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: payload.endAt,
        timeZone: "Asia/Tokyo",
      },
      extendedProperties: {
        private: {
          bookingId: payload.bookingId,
          userId: payload.userId,
          instrument: payload.instrument,
        },
      },
    }),
  });

  return { success: true, googleCalendarEventId: String(data.id ?? "") };
}

export async function writeCalendarSyncLog(input: {
  bookingId: string;
  action: "create" | "delete";
  status: "success" | "failed";
  googleCalendarEventId?: string;
  errorMessage?: string;
}) {
  await adminDb.collection("lessonCalendarSyncLogs").add({
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function createLessonApplication(uid: string, body: Record<string, unknown>) {
  const fullName = String(body.fullName ?? "").trim();
  const birthDate = String(body.birthDate ?? "").trim();
  const memberCount = parseBoundedInteger(body.memberCount, 1, 10);
  const rawMembers = Array.isArray(body.members) ? body.members : [];
  if (memberCount === null) {
    throw new Error("受講人数が正しくありません。");
  }
  const members = rawMembers.slice(0, memberCount).map((member) => ({
    name: String((member as { name?: unknown }).name ?? "").trim(),
    birthDate: String((member as { birthDate?: unknown }).birthDate ?? "").trim(),
  }));
  const postalCode = String(body.postalCode ?? "").trim();
  const address = String(body.address ?? "").trim();
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!fullName || !birthDate || !postalCode || !address || !phoneNumber || !email) {
    throw new Error("未入力の項目があります。");
  }
  if (!isEmailAddress(email)) {
    throw new Error("メールアドレスが正しくありません。");
  }
  if (!isValidBirthDate(birthDate)) {
    throw new Error("生年月日を正しく入力してください。");
  }
  if (memberCount >= 2 && (members.length !== memberCount || members.some((member) => !member.name || !isValidBirthDate(member.birthDate)))) {
    throw new Error("登録人数分の氏名と生年月日を入力してください。");
  }

  const normalizedMembers = memberCount === 1 ? [{ name: members[0]?.name || fullName, birthDate }] : members;

  const appRef = adminDb.collection("lessonApplications").doc();
  const userRef = adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    const user = userSnap.data() as LessonUser;
    if (user.isBlockedByAdmin) {
      throw new Error("現在このアカウントは休会中です。");
    }
    if (user.lessonApplicationStatus === "pending" || user.lessonApplicationStatus === "approved") {
      throw new Error("すでにレッスン申込済みです。");
    }

    const now = serverTimestamp();
    transaction.set(appRef, {
      id: appRef.id,
      userId: uid,
      fullName,
      birthDate,
      memberCount,
      members: normalizedMembers,
      postalCode,
      address,
      phoneNumber,
      email,
      status: "pending",
      createdAt: now,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
    });
    transaction.update(userRef, {
      lessonApplicationStatus: "pending",
      lessonFullName: fullName,
      lessonBirthDate: birthDate,
      lessonMemberCount: memberCount,
      lessonMembers: normalizedMembers,
      lessonPostalCode: postalCode,
      lessonAddress: address,
      lessonPhoneNumber: phoneNumber,
      lessonEmail: email,
      phoneNumber,
      updatedAt: now,
    });
  });

  return { id: appRef.id };
}

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
    const nextLessons = updateArrayWithoutBooking(current?.bookedLessons, bookingId);
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
      bookedLessons: nextLessons,
      bookedLessonDates: nextLessons.map((item: BookedLesson) => item.date),
      updatedAt: serverTimestamp(),
    });
  });

  return { bookingId };
}
