import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/firebase/api";
import { createLessonApplication } from "@/lib/lesson/server";
import { sendLessonApplicationAdminEmail } from "@/lib/contact/resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const result = await createLessonApplication(user.id, body);
    try {
      await sendLessonApplicationAdminEmail(result.application);
    } catch (emailError) {
      console.error("Failed to send lesson application admin email", emailError);
      return NextResponse.json({ id: result.id, emailWarning: "申込は完了しましたが、管理者への通知メール送信に失敗しました。" });
    }
    return NextResponse.json({ id: result.id });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "申込に失敗しました。");
  }
}
