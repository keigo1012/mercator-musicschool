import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/firebase/api";
import { createLessonApplication } from "@/lib/lesson/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const result = await createLessonApplication(user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "申込に失敗しました。");
  }
}
