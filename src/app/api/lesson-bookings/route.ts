import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { apiErrorResponse, requireUser } from "@/lib/firebase/api";
import { createLessonBooking } from "@/lib/lesson/server";
import { lessonBookingDateRange } from "@/lib/lesson/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { startDate, endDateExclusive } = lessonBookingDateRange();
    const filters = [
      { field: "date", op: "GREATER_THAN_OR_EQUAL" as const, value: startDate },
      { field: "date", op: "LESS_THAN" as const, value: endDateExclusive },
    ];
    const [lessonSnap, trialSnap] = await Promise.all([
      adminDb.collection("lessonBookings").getPage({ filters, orderBy: { field: "date", direction: "ASCENDING" }, limit: 1000 }),
      adminDb.collection("trialBookings").getPage({ filters, orderBy: { field: "date", direction: "ASCENDING" }, limit: 1000 }),
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
      isOwn: bookingType === "lesson" && data.userId === user.id,
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
    return apiErrorResponse(error, "予約取得に失敗しました。", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const result = await createLessonBooking(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "予約に失敗しました。");
  }
}
