import { NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue, serializeFirestore, serverTimestamp, type DocumentReference } from "./admin";
import { DEFAULT_INSTRUMENT } from "@/lib/lesson/constants";
import type { LessonUser } from "@/lib/lesson/types";
import { countRemainingLessons, makeLessonTicket, monthlyLessonGrantIssueDate, monthlyLessonGrantMonthKey, normalizeLessonTickets, todayTokyoDate } from "@/lib/lesson/tickets";

export const dynamic = "force-dynamic";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new Error("ログインが必要です。");
  }

  return adminAuth.verifyIdToken(token);
}

export async function requireUser(request: Request) {
  const authUser = await getAuthUserFromRequest(request);
  const uid = authUser.uid;
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const now = serverTimestamp();
    await ref.set({
      id: uid,
      name: authUser.displayName ?? "",
      email: authUser.email ?? "",
      phoneNumber: "",
      isAdmin: false,
      isBlockedByAdmin: false,
      hasLessonPlan: false,
      lessonApplicationStatus: "none",
      remainingLessons: 0,
      monthlyLessonGrantCount: 0,
      lastMonthlyLessonGrantMonth: "",
      lessonTickets: [],
      selectedLessonInstrument: DEFAULT_INSTRUMENT,
      bookedLessons: [],
      bookedLessonDates: [],
      createdAt: now,
      updatedAt: now,
    });
    const created = await ref.get();
    return serializeFirestore(created.data()) as LessonUser;
  }

  const user = serializeFirestore(snap.data()) as LessonUser;
  return reconcileLessonUser(ref, user);
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    throw new Error("管理者権限がありません。");
  }
  return user;
}

export async function reconcileLessonUser(ref: DocumentReference, user: LessonUser) {
  const now = new Date();
  const today = todayTokyoDate(now);
  const currentGrantMonth = monthlyLessonGrantMonthKey(now);
  const currentGrantIssueDate = monthlyLessonGrantIssueDate(now);
  const normalizedTickets = normalizeLessonTickets({ lessonTickets: user.lessonTickets, today });
  let lessonTickets = normalizedTickets;
  let lastMonthlyLessonGrantMonth = user.lastMonthlyLessonGrantMonth ?? "";

  if (user.hasLessonPlan && user.lessonApplicationStatus === "approved" && Number(user.monthlyLessonGrantCount ?? 0) > 0 && lastMonthlyLessonGrantMonth !== currentGrantMonth) {
    lessonTickets = [
      ...lessonTickets,
      makeLessonTicket({
        count: Number(user.monthlyLessonGrantCount),
        issuedOn: currentGrantIssueDate,
        source: "monthly",
      }),
    ].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.issuedOn.localeCompare(b.issuedOn));
    lastMonthlyLessonGrantMonth = currentGrantMonth;
  }

  const remainingLessons = countRemainingLessons(lessonTickets);
  const shouldUpdate =
    remainingLessons !== Number(user.remainingLessons ?? 0) ||
    lastMonthlyLessonGrantMonth !== (user.lastMonthlyLessonGrantMonth ?? "") ||
    JSON.stringify(lessonTickets) !== JSON.stringify(Array.isArray(user.lessonTickets) ? user.lessonTickets : []);

  if (shouldUpdate) {
    await ref.update({
      lessonTickets,
      remainingLessons,
      lastMonthlyLessonGrantMonth,
      updatedAt: serverTimestamp(),
    });
  }

  return {
    ...user,
    lessonTickets,
    remainingLessons,
    lastMonthlyLessonGrantMonth,
  };
}

export function updateArrayWithoutBooking(bookedLessons: unknown, bookingId: string) {
  return Array.isArray(bookedLessons) ? bookedLessons.filter((item) => typeof item === "object" && item && (item as { id?: string }).id !== bookingId) : [];
}

export { FieldValue };
