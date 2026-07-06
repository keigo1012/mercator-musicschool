import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snap = await adminDb.collection("lessonApplications").where("status", "==", "pending").get();
    const applications = snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ applications });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "申込一覧取得に失敗しました。", 403);
  }
}
