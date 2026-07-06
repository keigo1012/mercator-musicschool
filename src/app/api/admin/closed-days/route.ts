import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb.collection("lessonClosedDays").get();
    return NextResponse.json({ closedDays: snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "休業日取得に失敗しました。", 403);
  }
}
