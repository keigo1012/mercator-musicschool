import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireUser } from "@/lib/firebase/api";
import { lessonBookingDateRange } from "@/lib/lesson/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const { startDate, endDateExclusive } = lessonBookingDateRange();
    const snap = await adminDb.collection("lessonClosedDays").getPage({
      filters: [
        { field: "date", op: "GREATER_THAN_OR_EQUAL", value: startDate },
        { field: "date", op: "LESS_THAN", value: endDateExclusive },
      ],
      orderBy: { field: "date", direction: "ASCENDING" },
      limit: 1000,
    });
    const closedDays = snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ closedDays });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "休業日取得に失敗しました。", 401);
  }
}
