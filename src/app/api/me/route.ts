import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "ユーザー取得に失敗しました。", 401);
  }
}
