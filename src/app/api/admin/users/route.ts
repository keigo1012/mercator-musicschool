import { NextResponse } from "next/server";
import { adminDb, serializeFirestore } from "@/lib/firebase/admin";
import { jsonError, reconcileLessonUser, requireAdmin } from "@/lib/firebase/api";
import type { LessonUser } from "@/lib/lesson/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const query = (new URL(request.url).searchParams.get("query") ?? "").toLowerCase();
    const snap = await adminDb.collection("users").get();
    const users = await Promise.all(
      snap.docs.map(async (doc) => {
        const user = serializeFirestore({ id: doc.id, ...doc.data() }) as LessonUser;
        return reconcileLessonUser(doc.ref, user);
      }),
    );
    const filteredUsers = users
      .filter((user) => user.id !== admin.id && !user.isAdmin)
      .filter((user) => {
        if (!query) return true;
        return [user.name, user.email, user.lessonFullName, user.lessonPhoneNumber, ...(user.lessonMembers ?? []).map((member) => member.name)].join(" ").toLowerCase().includes(query);
      });
    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "ユーザー取得に失敗しました。", 403);
  }
}
