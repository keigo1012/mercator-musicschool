import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireUser } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const snap = await adminDb.collection("lessonClosedDays").get();
    const closedDays = snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ closedDays });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "休業日取得に失敗しました。", 401);
  }
}
