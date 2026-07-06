import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireUser } from "@/lib/firebase/api";
import { createLessonBooking } from "@/lib/lesson/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const [lessonSnap, trialSnap] = await Promise.all([
      adminDb.collection("lessonBookings").get(),
      adminDb.collection("trialBookings").get(),
    ]);
    const sanitizeBooking = (data: Record<string, unknown>, bookingType: "lesson" | "trial") => ({
      id: data.id,
      bookingType,
      instrument: data.instrument,
      date: data.date,
      startAt: data.startAt,
      endAt: data.endAt,
      userName: bookingType === "trial" ? "体験レッスン" : "予約済み",
      userEmail: "",
      userPhoneNumber: "",
    });
    const lessonBookings = lessonSnap.docs.map((doc) => {
      const data = serializeFirestore({ id: doc.id, bookingType: "lesson", ...doc.data() }) as Record<string, unknown>;
      return user.isAdmin ? data : sanitizeBooking(data, "lesson");
    });
    const trialBookings = trialSnap.docs.map((doc) => {
      const data = serializeFirestore({ id: doc.id, bookingType: "trial", ...doc.data() }) as Record<string, unknown>;
      return user.isAdmin ? data : sanitizeBooking(data, "trial");
    });
    const bookings = [...lessonBookings, ...trialBookings];
    return NextResponse.json({ bookings });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約取得に失敗しました。", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const result = await createLessonBooking(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約に失敗しました。");
  }
}
