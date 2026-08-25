import { NextResponse } from "next/server";
import { apiErrorResponse, requireAdmin } from "@/lib/firebase/api";
import { createAdminAssignedLessons } from "@/lib/lesson/server/admin-assignment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const result = await createAdminAssignedLessons(admin.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "管理者付与レッスンの登録に失敗しました。");
  }
}
