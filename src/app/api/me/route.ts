import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({
      user: {
        ...user,
        bookedLessons: [],
        bookedLessonDates: [],
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "ユーザー取得に失敗しました。", 401);
  }
}
