import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { apiErrorResponse, requireAdmin } from "@/lib/firebase/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const month = new URL(request.url).searchParams.get("month") ?? "";
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("対象月が正しくありません。");
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, "0")}`;
    const snap = await adminDb.collection("lessonClosedDays").getPage({
      filters: [
        { field: "date", op: "GREATER_THAN_OR_EQUAL", value: `${month}-01` },
        { field: "date", op: "LESS_THAN", value: `${nextMonth}-01` },
      ],
      orderBy: { field: "date", direction: "ASCENDING" },
      limit: 1000,
    });
    return NextResponse.json({ closedDays: snap.docs.map((doc) => serializeFirestore({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    return apiErrorResponse(error, "休業日取得に失敗しました。", 403);
  }
}
