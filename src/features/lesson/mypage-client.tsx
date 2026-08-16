"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import { formatBirthDateWithAgeAndGrade } from "@/lib/lesson/dates";
import type { LessonUser } from "@/lib/lesson/types";
import { expiryWarningTickets } from "@/lib/lesson/tickets";
import { BookedLessonsCard, card, Info, LessonTicketWarning, primaryButton } from "./lesson-shared";

function formatLessonMember(member: NonNullable<LessonUser["lessonMembers"]>[number], showGrade = false) {
  return `${member.name} (${showGrade ? formatBirthDateWithAgeAndGrade(member.birthDate) : member.birthDate})`;
}


export function MyPage({ authUser, user }: { authUser: User; user: LessonUser }) {
  const status = user.isBlockedByAdmin ? "休会中" : user.lessonApplicationStatus === "pending" ? "承認待ち" : user.lessonApplicationStatus === "approved" ? "承認済み" : user.lessonApplicationStatus === "rejected" ? "却下" : "未申込";
  const expiringTickets = expiryWarningTickets(user.lessonTickets ?? []);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <article className={card}>
        <h2 className="panel-heading font-black text-slate-950">会員情報</h2>
        <dl className="mt-5 grid gap-3 text-sm">
          <Info label="氏名" value={user.lessonFullName || user.name || "未登録"} />
          {user.lessonMembers?.length && user.lessonMembers.length >= 2 ? <Info label="登録会員" value={user.lessonMembers.map((member) => formatLessonMember(member, true)).join(" / ")} /> : null}
          <Info label="メールアドレス" value={user.email} />
          <Info label="電話番号" value={user.lessonPhoneNumber || user.phoneNumber || "未登録"} />
          <Info label="レッスン申込状態" value={status} />
          <Info label="残りレッスン回数" value={`${user.remainingLessons ?? 0}回`} />
        </dl>
        {expiringTickets.length ? <LessonTicketWarning tickets={expiringTickets} /> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {user.isBlockedByAdmin ? <p className="font-bold text-red-700">現在このアカウントは休会中です。</p> : null}
          {!user.isBlockedByAdmin && user.lessonApplicationStatus === "none" ? <Link className={primaryButton} href="/lesson">会員登録</Link> : null}
          {!user.isBlockedByAdmin && user.lessonApplicationStatus === "pending" ? <p className="font-bold text-[#015F96]">管理者の承認待ちです。</p> : null}
          {!user.isBlockedByAdmin && user.hasLessonPlan ? <Link className={primaryButton} href="/lesson">レッスン予約へ</Link> : null}
        </div>
      </article>
      <BookedLessonsCard key={`${user.id}-${user.updatedAt ?? ""}`} authUser={authUser} />
    </div>
  );
}
