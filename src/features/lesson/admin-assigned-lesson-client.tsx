"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { LESSON_HOURS } from "@/lib/lesson/constants";
import { isoDate, toTokyoParts } from "@/lib/lesson/dates";
import type { LessonUser } from "@/lib/lesson/types";
import { apiFetch, inputClass, primaryButton, subtleButton } from "./lesson-shared";
import { lessonUserSearchText, lessonUserSortName } from "./admin-shared";

type AssignmentTarget = {
  key: string;
  userId: string;
  memberIndex: number;
  memberName: string;
  accountName: string;
  remainingLessons: number;
  disabledReason: string;
  searchText: string;
};

type AssignmentResponse = {
  succeeded: Array<{ userId: string; memberIndex: number; memberName?: string; bookingId: string }>;
  failed: Array<{ userId: string; memberIndex: number; error: string }>;
};

function todayIso() {
  const now = toTokyoParts();
  return isoDate(now.year, now.month, now.day);
}

function targetsFromUsers(users: LessonUser[]): AssignmentTarget[] {
  return users
    .filter((user) => user.lessonApplicationStatus === "approved" || user.hasLessonPlan)
    .sort((a, b) => lessonUserSortName(a).localeCompare(lessonUserSortName(b), "ja"))
    .flatMap((user) => {
      const accountName = user.lessonFullName || user.name || "未登録";
      const members = user.lessonMembers?.length
        ? user.lessonMembers
        : [{ name: accountName, birthDate: user.lessonBirthDate || "" }];
      const disabledReason = user.isBlockedByAdmin
        ? "休会中"
        : !user.hasLessonPlan || user.lessonApplicationStatus !== "approved"
          ? "未承認"
          : Number(user.remainingLessons ?? 0) <= 0
            ? "残り0回"
            : "";
      return members.map((member, memberIndex) => ({
        key: JSON.stringify([user.id, memberIndex]),
        userId: user.id,
        memberIndex,
        memberName: member.name || accountName,
        accountName,
        remainingLessons: Number(user.remainingLessons ?? 0),
        disabledReason,
        searchText: `${lessonUserSearchText(user)} ${member.name}`.toLowerCase(),
      }));
    });
}

export function AdminAssignedLessonPanel({ authUser, users, refresh, setError, setNotice }: {
  authUser: User;
  users: LessonUser[];
  refresh: () => void | Promise<void>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState<{ lessonTitle: string; date: string; hour: number }>({ lessonTitle: "", date: todayIso(), hour: LESSON_HOURS[0] });
  const [busy, setBusy] = useState(false);
  const targets = useMemo(() => targetsFromUsers(users), [users]);
  const filteredTargets = targets.filter((target) => target.searchText.includes(query.trim().toLowerCase()));
  const selectedTargets = targets.filter((target) => selectedKeys.has(target.key));

  function toggleTarget(target: AssignmentTarget) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(target.key)) next.delete(target.key);
      else next.add(target.key);
      return next;
    });
  }

  function selectVisible() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      filteredTargets.filter((target) => !target.disabledReason).forEach((target) => next.add(target.key));
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const lessonTitle = form.lessonTitle.trim();
    if (!lessonTitle) {
      setError("レッスン名を入力してください。");
      return;
    }
    if (!selectedTargets.length) {
      setError("対象会員を選択してください。");
      return;
    }
    if (!confirm(`「${lessonTitle}」を${form.date} ${form.hour}:00から${selectedTargets.length}名に付与し、1名につきレッスン回数を1回消化しますか？`)) return;

    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<AssignmentResponse>("/api/admin/assigned-lessons/", authUser, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          lessonTitle,
          targets: selectedTargets.map(({ userId, memberIndex }) => ({ userId, memberIndex })),
        }),
      });
      const succeededKeys = new Set(result.succeeded.map((item) => JSON.stringify([item.userId, item.memberIndex])));
      setSelectedKeys((current) => new Set([...current].filter((key) => !succeededKeys.has(key))));
      if (result.succeeded.length) {
        setNotice(`${result.succeeded.length}名に「${lessonTitle}」を付与しました。${result.failed.length ? ` ${result.failed.length}名は付与できませんでした。` : ""}`);
        setForm((current) => ({ ...current, lessonTitle: "" }));
        await refresh();
      }
      if (result.failed.length) {
        const namesByKey = new Map(targets.map((target) => [target.key, target.memberName]));
        setError(result.failed.map((item) => `${namesByKey.get(JSON.stringify([item.userId, item.memberIndex])) ?? item.userId}: ${item.error}`).join(" / "));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "管理者付与レッスンの登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">管理者付与レッスン</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-[#015F96]">選択 {selectedTargets.length}名</span>
      </div>
      <form className="mt-4 grid gap-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_9rem]">
          <label className="text-sm font-bold text-slate-700">レッスン名<input className={`${inputClass} mt-2`} maxLength={60} placeholder="例：発表会リハーサル" value={form.lessonTitle} onChange={(event) => setForm({ ...form, lessonTitle: event.target.value })} required /></label>
          <label className="text-sm font-bold text-slate-700">日付<input className={`${inputClass} mt-2`} type="date" min={todayIso()} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
          <label className="text-sm font-bold text-slate-700">開始時間<select className={`${inputClass} mt-2 appearance-none`} value={form.hour} onChange={(event) => setForm({ ...form, hour: Number(event.target.value) })}>{LESSON_HOURS.map((hour) => <option key={hour} value={hour}>{hour}:00</option>)}</select></label>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-950/10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label className="min-w-48 flex-1 text-sm font-bold text-slate-700">対象会員を検索<input className={`${inputClass} mt-2`} placeholder="氏名・メール・電話番号" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="flex flex-wrap gap-2"><button type="button" className={subtleButton} onClick={selectVisible}>表示中を全選択</button><button type="button" className={subtleButton} onClick={() => setSelectedKeys(new Set())}>選択解除</button></div>
          </div>
          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {filteredTargets.map((target) => (
              <label key={target.key} className={`flex items-start gap-3 rounded-lg border p-3 ${target.disabledReason ? "border-slate-200 bg-slate-50 text-slate-400" : selectedKeys.has(target.key) ? "border-[#0176BA]/40 bg-[#EAF6FD]" : "border-slate-950/10 bg-white"}`}>
                <input className="mt-1 size-4" type="checkbox" disabled={Boolean(target.disabledReason)} checked={selectedKeys.has(target.key)} onChange={() => toggleTarget(target)} />
                <span className="min-w-0"><span className="block font-bold">{target.memberName}</span>{target.accountName !== target.memberName ? <span className="block text-xs">申込者：{target.accountName}</span> : null}<span className="block text-xs">残り回数：{target.remainingLessons}回</span></span>
              </label>
            ))}
          </div>
        </div>
        <button className={`${primaryButton} justify-self-start`} disabled={busy}>{busy ? "付与中" : `選択した${selectedTargets.length}名に付与`}</button>
      </form>
    </section>
  );
}
