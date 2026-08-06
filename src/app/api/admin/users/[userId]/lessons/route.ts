import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import type { BookedLesson } from "@/lib/lesson/types";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/admin/users/[userId]/lessons">) {
  try {
    await requireAdmin(request);
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursorValue = searchParams.get("cursor");
    const cursorId = searchParams.get("cursorId");
    const snap = await adminDb.collection("lessonBookings").getPage({
      filters: [
        { field: "userId", op: "EQUAL", value: userId },
      ],
      orderBy: { field: "date", direction: "DESCENDING" },
      limit: PAGE_SIZE,
      cursor: cursorValue && cursorId ? { value: cursorValue, id: cursorId } : undefined,
    });
    const lessons = snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() }) as BookedLesson);
    const last = lessons.at(-1);

    return NextResponse.json({
      lessons,
      cursor: last ? { value: last.date, id: last.id } : null,
      hasMore: lessons.length === PAGE_SIZE,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "レッスン履歴の取得に失敗しました。", 403);
  }
}
