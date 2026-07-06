import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { getInstrumentLabel } from "@/lib/lesson/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "upcoming";
    const query = (searchParams.get("query") ?? "").toLowerCase();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
    const [lessonSnap, trialSnap] = await Promise.all([
      adminDb.collection("lessonBookings").get(),
      adminDb.collection("trialBookings").get(),
    ]);
    const allBookings = [
      ...lessonSnap.docs.map((doc) => serializeFirestore({ id: doc.id, bookingType: "lesson", ...doc.data() }) as Record<string, string>),
      ...trialSnap.docs.map((doc) => serializeFirestore({ id: doc.id, bookingType: "trial", ...doc.data() }) as Record<string, string>),
    ];
    const bookings = allBookings
      .filter((booking) => (period === "past" ? booking.date < today : booking.date >= today))
      .filter((booking) => {
        if (!query) return true;
        const instrumentLabel = getInstrumentLabel(booking.instrument);
        const bookingTypeLabel = booking.bookingType === "trial" ? "体験レッスン" : "通常レッスン";
        const lessonFormatLabel = booking.lessonFormat === "online" ? "オンライン" : booking.lessonFormat === "inPerson" ? "対面" : "";
        return [bookingTypeLabel, booking.userName, booking.userPhoneNumber, booking.userEmail, booking.userBirthDate, lessonFormatLabel, booking.instrument, instrumentLabel, booking.date, booking.startAt].join(" ").toLowerCase().includes(query);
      })
      .sort((a, b) => (period === "past" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));
    return NextResponse.json({ bookings });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約一覧取得に失敗しました。", 403);
  }
}
