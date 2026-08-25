import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { apiErrorResponse, requireUser } from "@/lib/firebase/api";
import { toTokyoParts, isoDate } from "@/lib/lesson/dates";
import type { BookedLesson } from "@/lib/lesson/types";

const PAGE_SIZE = 8;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") === "past" ? "past" : "upcoming";
    const cursorValue = searchParams.get("cursor");
    const cursorId = searchParams.get("cursorId");
    const current = toTokyoParts();
    const today = isoDate(current.year, current.month, current.day);
    const direction = tab === "past" ? "DESCENDING" as const : "ASCENDING" as const;
    const snap = await adminDb.collection("lessonBookings").getPage({
      filters: [
        { field: "userId", op: "EQUAL", value: user.id },
        { field: "date", op: tab === "past" ? "LESS_THAN" : "GREATER_THAN_OR_EQUAL", value: today },
      ],
      orderBy: { field: "date", direction },
      limit: PAGE_SIZE,
      cursor: cursorValue && cursorId ? { value: cursorValue, id: cursorId } : undefined,
    });
    const lessons = snap.docs.map((doc) => {
      const lesson = serializeFirestore({ id: doc.id, ...doc.data() }) as BookedLesson;
      const memberVisibleLesson = { ...lesson };
      delete memberVisibleLesson.assignedBy;
      return memberVisibleLesson;
    });
    const last = lessons.at(-1);

    return NextResponse.json({
      lessons,
      cursor: last ? { value: last.date, id: last.id } : null,
      hasMore: lessons.length === PAGE_SIZE,
    });
  } catch (error) {
    return apiErrorResponse(error, "レッスン履歴の取得に失敗しました。", 401);
  }
}
