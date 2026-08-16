"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { formatBirthDateWithAgeAndGrade } from "@/lib/lesson/dates";
import type { LessonApplication } from "@/lib/lesson/types";
import { apiFetch, card, inputClass, primaryButton, subtleButton } from "./lesson-shared";
import { defaultTicketExpiry, formatLessonMember, todayIso } from "./admin-shared";

export function AdminApplications({ authUser, applications, refresh, setError, setNotice }: { authUser: User; applications: LessonApplication[]; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [values, setValues] = useState<Record<string, { issueCount: number; expiresOn: string; monthlyLessonGrantCount: number }>>({});
  function currentValues(app: LessonApplication) {
    return values[app.id] ?? { issueCount: 0, expiresOn: defaultTicketExpiry(), monthlyLessonGrantCount: 2 };
  }
  async function approve(app: LessonApplication) {
    try {
      const current = currentValues(app);
      await apiFetch(`/api/admin/lesson-applications/${app.id}/approve/`, authUser, { method: "PATCH", body: JSON.stringify(current) });
      setNotice("承認しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "承認に失敗しました。");
    }
  }
  return (
    <article className={card}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">レッスン申込承認</h2><button className={subtleButton} onClick={refresh}>更新</button></div>
      <div className="space-y-3">
        {applications.length ? applications.map((app) => {
          const current = currentValues(app);
          return (
            <div key={app.id} className="rounded-lg bg-[#f7fbfa] p-3">
              <div className="font-black">{app.fullName}</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">登録人数: {app.memberCount}名<br />受講者: {app.members.map((member) => formatLessonMember(member, true)).join(" / ")}<br />申込者の生年月日: {formatBirthDateWithAgeAndGrade(app.birthDate)}<br />郵便番号: {app.postalCode}<br />住所: {app.address}<br />電話番号: {app.phoneNumber}<br />メール: {app.email}</div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto]">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">単発付与<input className={`${inputClass} mt-2`} inputMode="numeric" pattern="[0-9]*" value={String(current.issueCount)} onChange={(e) => setValues({ ...values, [app.id]: { ...current, issueCount: Number(e.target.value.replace(/\D/g, "")) } })} /></label>
                  <label className="block text-sm font-bold text-slate-700">有効期限<input className={`${inputClass} mt-2`} type="date" min={todayIso()} value={current.expiresOn} onChange={(e) => setValues({ ...values, [app.id]: { ...current, expiresOn: e.target.value } })} /></label>
                </div>
                <button className={`${primaryButton} self-end`} onClick={() => approve(app)}>承認</button>
                <label className="block text-sm font-bold text-slate-700">毎月自動付与<input className={`${inputClass} mt-2`} inputMode="numeric" pattern="[0-9]*" value={String(current.monthlyLessonGrantCount)} onChange={(e) => setValues({ ...values, [app.id]: { ...current, monthlyLessonGrantCount: Number(e.target.value.replace(/\D/g, "")) } })} /></label>
              </div>
            </div>
          );
        }) : <p className="text-sm text-slate-500">承認待ちの申込はありません。</p>}
      </div>
    </article>
  );
}
