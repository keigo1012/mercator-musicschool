import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

const PAGE_SIZE = 8;
const COLLECTIONS = ["lessonBookings", "trialBookings"] as const;
type BookingTab = "new" | "future" | "past";
type Booking = Record<string, unknown> & { id: string; bookingType: "lesson" | "trial"; date: string; startAt: string; createdAt?: string };

function toBooking(collection: (typeof COLLECTIONS)[number], doc: { id: string; data: () => Record<string, unknown> }) {
  return serializeFirestore({ id: doc.id, bookingType: collection === "trialBookings" ? "trial" : "lesson", ...doc.data() }) as Booking;
}

function cursorFrom(value: string | null, id: string | null) {
  return value && id ? { value, id } : undefined;
}

function compareBookings(tab: BookingTab, a: Booking, b: Booking) {
  const aValue = tab === "new" ? a.createdAt || a.startAt : a.date;
  const bValue = tab === "new" ? b.createdAt || b.startAt : b.date;
  const result = aValue.localeCompare(bValue) || a.id.localeCompare(b.id);
  return tab === "past" || tab === "new" ? -result : result;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") ?? "list";

    if (mode === "calendar") {
      const month = searchParams.get("month") ?? "";
      if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("対象月が正しくありません。");
      const [year, monthNumber] = month.split("-").map(Number);
      const nextMonth = `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, "0")}`;
      const filters = [{ field: "date", op: "GREATER_THAN_OR_EQUAL" as const, value: `${month}-01` }, { field: "date", op: "LESS_THAN" as const, value: `${nextMonth}-01` }];
      const results = await Promise.all(COLLECTIONS.map(async (collection) => {
        const snap = await adminDb.collection(collection).getPage({ filters, orderBy: { field: "date", direction: "ASCENDING" }, limit: 100 });
        return snap.docs.map((doc) => toBooking(collection, doc));
      }));
      return NextResponse.json({ bookings: results.flat().sort((a, b) => a.startAt.localeCompare(b.startAt)) });
    }

    if (mode === "search") {
      const results = await Promise.all(COLLECTIONS.map(async (collection) => {
        const snap = await adminDb.collection(collection).get();
        return snap.docs.map((doc) => toBooking(collection, doc));
      }));
      return NextResponse.json({ bookings: results.flat().sort((a, b) => b.startAt.localeCompare(a.startAt)) });
    }

    const tab = searchParams.get("tab") as BookingTab;
    if (!(["new", "future", "past"] as string[]).includes(tab)) throw new Error("予約一覧の種別が正しくありません。");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
    const orderBy = tab === "new" ? { field: "createdAt", direction: "DESCENDING" as const } : { field: "date", direction: tab === "past" ? "DESCENDING" as const : "ASCENDING" as const };
    const filters = tab === "new" ? [] : [{ field: "date", op: tab === "past" ? "LESS_THAN" as const : "GREATER_THAN_OR_EQUAL" as const, value: today }];
    const pages = await Promise.all(COLLECTIONS.map(async (collection) => {
      const prefix = collection === "lessonBookings" ? "lesson" : "trial";
      const snap = await adminDb.collection(collection).getPage({ filters, orderBy, limit: PAGE_SIZE, cursor: cursorFrom(searchParams.get(`${prefix}Cursor`), searchParams.get(`${prefix}CursorId`)) });
      return { collection, docs: snap.docs.map((doc) => toBooking(collection, doc)) };
    }));
    const bookings = pages.flatMap((page) => page.docs).sort((a, b) => compareBookings(tab, a, b)).slice(0, PAGE_SIZE);
    const cursors = Object.fromEntries(COLLECTIONS.map((collection) => {
      const booking = [...bookings].reverse().find((item) => item.bookingType === (collection === "trialBookings" ? "trial" : "lesson"));
      const value = booking ? (tab === "new" ? booking.createdAt || booking.startAt : booking.date) : "";
      return [collection === "lessonBookings" ? "lesson" : "trial", booking ? { value, id: booking.id } : null];
    }));
    const hasMore = pages.some((page) => page.docs.length === PAGE_SIZE) || pages.some((page) => page.docs.some((booking) => !bookings.includes(booking)));
    return NextResponse.json({ bookings, cursors, hasMore });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約一覧取得に失敗しました。", 403);
  }
}
