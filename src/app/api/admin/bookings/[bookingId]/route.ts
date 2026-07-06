import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/firebase/api";
import { cancelLessonBooking } from "@/lib/lesson/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: RouteContext<"/api/admin/bookings/[bookingId]">) {
  try {
    const admin = await requireAdmin(request);
    const { bookingId } = await context.params;
    const result = await cancelLessonBooking(bookingId, admin.id, { admin: true });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "予約取消に失敗しました。");
  }
}
