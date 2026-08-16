import { adminDb, serverTimestamp } from "@/lib/firebase/admin";
import { isValidBirthDate } from "@/lib/lesson/dates";
import { isEmailAddress, parseBoundedInteger } from "@/lib/lesson/validation";
import type { LessonUser } from "@/lib/lesson/types";

export async function createLessonApplication(uid: string, body: Record<string, unknown>) {
  const fullName = String(body.fullName ?? "").trim();
  const birthDate = String(body.birthDate ?? "").trim();
  const memberCount = parseBoundedInteger(body.memberCount, 1, 10);
  const rawMembers = Array.isArray(body.members) ? body.members : [];
  if (memberCount === null) {
    throw new Error("受講人数が正しくありません。");
  }
  const members = rawMembers.slice(0, memberCount).map((member) => ({
    name: String((member as { name?: unknown }).name ?? "").trim(),
    birthDate: String((member as { birthDate?: unknown }).birthDate ?? "").trim(),
  }));
  const postalCode = String(body.postalCode ?? "").trim();
  const address = String(body.address ?? "").trim();
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!fullName || !birthDate || !postalCode || !address || !phoneNumber || !email) {
    throw new Error("未入力の項目があります。");
  }
  if (!isEmailAddress(email)) {
    throw new Error("メールアドレスが正しくありません。");
  }
  if (!isValidBirthDate(birthDate)) {
    throw new Error("生年月日を正しく入力してください。");
  }
  if (memberCount >= 2 && (members.length !== memberCount || members.some((member) => !member.name || !isValidBirthDate(member.birthDate)))) {
    throw new Error("登録人数分の氏名と生年月日を入力してください。");
  }

  const normalizedMembers = memberCount === 1 ? [{ name: members[0]?.name || fullName, birthDate }] : members;

  const appRef = adminDb.collection("lessonApplications").doc();
  const userRef = adminDb.collection("users").doc(uid);

  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    const user = userSnap.data() as LessonUser;
    if (user.isBlockedByAdmin) {
      throw new Error("現在このアカウントは休会中です。");
    }
    if (user.lessonApplicationStatus === "pending" || user.lessonApplicationStatus === "approved") {
      throw new Error("すでにレッスン申込済みです。");
    }

    const now = serverTimestamp();
    transaction.set(appRef, {
      id: appRef.id,
      userId: uid,
      fullName,
      birthDate,
      memberCount,
      members: normalizedMembers,
      postalCode,
      address,
      phoneNumber,
      email,
      status: "pending",
      createdAt: now,
      approvedAt: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedBy: null,
    });
    transaction.update(userRef, {
      lessonApplicationStatus: "pending",
      lessonFullName: fullName,
      lessonBirthDate: birthDate,
      lessonMemberCount: memberCount,
      lessonMembers: normalizedMembers,
      lessonPostalCode: postalCode,
      lessonAddress: address,
      lessonPhoneNumber: phoneNumber,
      lessonEmail: email,
      phoneNumber,
      updatedAt: now,
    });
  });

  return {
    id: appRef.id,
    application: {
      fullName,
      birthDate,
      memberCount,
      members: normalizedMembers,
      postalCode,
      address,
      phoneNumber,
      email,
    },
  };
}
