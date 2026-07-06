import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/firebase/api";
import { cancelLessonBooking } from "@/lib/lesson/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: RouteContext<"/api/lesson-bookings/[bookingId]">) {
  try {
    const user = await requireUser(request);
    const { bookingId } = await context.params;
    const result = await cancelLessonBooking(bookingId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "キャンセルに失敗しました。");
  }
}
