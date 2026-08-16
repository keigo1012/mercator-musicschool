"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { formatBirthDateWithAgeAndGrade, formatDateJa } from "@/lib/lesson/dates";
import { getInstrumentLabel } from "@/lib/lesson/constants";
import type { BookedLesson, LessonUser } from "@/lib/lesson/types";
import { apiFetch, card, dangerButton, formatLessonFormat, Info, inputClass, primaryButton, selectedButton, subtleButton } from "./lesson-shared";
import { defaultTicketExpiry, formatLessonMember, formatTicketSource, lessonUserMemberTotal, lessonUserSearchText, lessonUserSortName, todayIso } from "./admin-shared";

export function AdminMemberUsers({ authUser, users, refresh, setError, setNotice }: { authUser: User; users: LessonUser[]; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [query, setQuery] = useState("");
  const [memberTab, setMemberTab] = useState<"registered" | "unregistered">("registered");
  const [values, setValues] = useState<Record<string, { monthlyLessonGrantCount: number; issueCount: number; expiresOn: string }>>({});
  const [historyUserId, setHistoryUserId] = useState("");
  const [historyLessons, setHistoryLessons] = useState<BookedLesson[]>([]);
  const [historyCursor, setHistoryCursor] = useState<{ value: string; id: string } | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const registeredUsers = users.filter((user) => user.lessonApplicationStatus === "approved" || user.hasLessonPlan);
  const unregisteredUsers = users.filter((user) => user.lessonApplicationStatus !== "approved" && !user.hasLessonPlan);
  const targets = memberTab === "registered" ? registeredUsers : unregisteredUsers;
  async function togglePause(user: LessonUser) {
    const action = user.isBlockedByAdmin ? "休会を解除" : "休会";
    if (!confirm(`${user.lessonFullName || user.name || "このユーザー"}さんを${action}しますか？`)) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}/block/`, authUser, { method: "PATCH", body: JSON.stringify({ isBlockedByAdmin: !user.isBlockedByAdmin }) });
      setNotice("休会状態を更新しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新に失敗しました。");
    }
  }
  async function withdrawUser(user: LessonUser) {
    const name = user.lessonFullName || user.name || "このユーザー";
    if (!confirm(`${name}さんを退会させますか？\n\n会員情報、会員登録の申込情報、ログインアカウントが完全に削除されます。この操作は取り消せません。カレンダーと過去・未来の予約は記録として残ります。`)) return;
    setDeletingUserId(user.id);
    setError("");
    try {
      await apiFetch(`/api/admin/users/${user.id}/`, authUser, { method: "DELETE" });
      if (historyUserId === user.id) {
        setHistoryUserId("");
        setHistoryLessons([]);
      }
      setNotice(`${name}さんを退会処理しました。`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "退会処理に失敗しました。");
    } finally {
      setDeletingUserId("");
    }
  }
  async function loadHistory(user: LessonUser, append = false) {
    if (historyLoading) return;
    if (!append && historyUserId === user.id) {
      setHistoryUserId("");
      return;
    }
    setHistoryLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (append && historyCursor) {
        params.set("cursor", historyCursor.value);
        params.set("cursorId", historyCursor.id);
      }
      const queryString = params.size ? `?${params}` : "";
      const data = await apiFetch<{ lessons: BookedLesson[]; cursor: { value: string; id: string } | null; hasMore: boolean }>(`/api/admin/users/${user.id}/lessons${queryString}`, authUser);
      setHistoryUserId(user.id);
      setHistoryLessons((current) => append ? [...current, ...data.lessons] : data.lessons);
      setHistoryCursor(data.cursor);
      setHistoryHasMore(data.hasMore);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "レッスン履歴の取得に失敗しました。");
    } finally {
      setHistoryLoading(false);
    }
  }
  function currentValues(user: LessonUser) {
    return values[user.id] ?? { monthlyLessonGrantCount: Number(user.monthlyLessonGrantCount ?? 0) > 0 ? user.monthlyLessonGrantCount : 2, issueCount: 0, expiresOn: defaultTicketExpiry() };
  }
  async function saveMonthlyGrant(user: LessonUser) {
    const count = currentValues(user).monthlyLessonGrantCount;
    if (!confirm(`毎月26日の自動付与を${count}回に設定しますか？`)) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}/monthly-grant/`, authUser, { method: "PATCH", body: JSON.stringify({ monthlyLessonGrantCount: count }) });
      setNotice("保存しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存に失敗しました。");
    }
  }
  async function issueTicket(user: LessonUser) {
    const current = currentValues(user);
    if (!confirm(`単発で${current.issueCount}回を付与しますか？\n有効期限：${current.expiresOn}`)) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}/remaining-lessons/`, authUser, { method: "POST", body: JSON.stringify({ count: current.issueCount, expiresOn: current.expiresOn }) });
      setNotice("回数券を発行しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "回数券発行に失敗しました。");
    }
  }
  async function deleteTicket(user: LessonUser, ticketId: string) {
    if (!confirm("この回数券を削除しますか？")) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}/remaining-lessons/?ticketId=${encodeURIComponent(ticketId)}`, authUser, { method: "DELETE" });
      setNotice("回数券を削除しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "回数券削除に失敗しました。");
    }
  }
  const filtered = targets
    .filter((user) => lessonUserSearchText(user).includes(query.toLowerCase()))
    .sort((a, b) => lessonUserSortName(a).localeCompare(lessonUserSortName(b), "ja"));
  const historyToday = todayIso();
  const displayedHistoryLessons = [...historyLessons].sort((a, b) => {
    const aUpcoming = a.date >= historyToday;
    const bUpcoming = b.date >= historyToday;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt);
  });
  return (
    <article className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">会員管理</h2>
        <button className={subtleButton} onClick={refresh}>更新</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className={memberTab === "registered" ? selectedButton : subtleButton} onClick={() => setMemberTab("registered")}>登録済み</button>
        <button className={memberTab === "unregistered" ? selectedButton : subtleButton} onClick={() => setMemberTab("unregistered")}>未登録</button>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <input className={inputClass} placeholder="ユーザー検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="rounded-lg bg-[#f7fbfa] px-4 py-2 text-sm font-bold text-slate-700">
          会員数 {lessonUserMemberTotal(targets)}名 / ユーザー数 {targets.length}名
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {filtered.length ? filtered.map((user) => {
          const current = currentValues(user);
          const savedMonthlyGrantCount = user.monthlyLessonGrantCount ?? 0;
          return <div key={user.id} className="rounded-lg bg-[#f7fbfa] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-black">{user.lessonFullName || user.name || "未登録"}</div>
                <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <Info label="電話番号" value={user.lessonPhoneNumber || user.phoneNumber || "未登録"} />
                  <Info label="メールアドレス" value={user.lessonEmail || user.email || "未登録"} />
                  <Info label="生年月日" value={formatBirthDateWithAgeAndGrade(user.lessonBirthDate)} />
                  <Info label="住所" value={user.lessonAddress || "未登録"} />
                </div>
                {user.lessonMembers?.length && user.lessonMembers.length >= 2 ? (
                  <div className="mt-2 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-950/10">
                    <div className="text-xs font-bold text-slate-500">登録会員</div>
                    <div className="mt-1 font-bold text-slate-900">{user.lessonMembers.map((member) => formatLessonMember(member, true)).join(" / ")}</div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={historyUserId === user.id ? selectedButton : subtleButton} disabled={historyLoading} onClick={() => void loadHistory(user)}>{historyUserId === user.id ? "閉じる" : "履歴"}</button>
                <button className={user.isBlockedByAdmin ? subtleButton : primaryButton} disabled={deletingUserId === user.id} onClick={() => togglePause(user)}>{user.isBlockedByAdmin ? "解除" : "休会"}</button>
                <button className={dangerButton} disabled={deletingUserId === user.id} onClick={() => withdrawUser(user)}>{deletingUserId === user.id ? "退会処理中" : "退会"}</button>
              </div>
            </div>
            {memberTab === "registered" ? (
              <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-slate-950/10">
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-md bg-[#f7fbfa] px-3 py-2">
                    <div className="text-xs font-bold text-slate-500">現在の残り回数</div>
                    <div className="font-black text-slate-950">{user.remainingLessons ?? 0}回</div>
                  </div>
                  <div className="rounded-md bg-[#f7fbfa] px-3 py-2">
                    <div className="text-xs font-bold text-slate-500">毎月26日の自動付与</div>
                    <div className="font-black text-slate-950">{savedMonthlyGrantCount > 0 ? `${savedMonthlyGrantCount}回` : "なし"}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {user.lessonTickets?.length ? user.lessonTickets.map((ticket) => (
                    <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#f7fbfa] px-3 py-2">
                      <span className="font-bold">{ticket.count}回</span>
                      <span>有効期限 {ticket.expiresOn}</span>
                      <span className="text-xs text-slate-500">{formatTicketSource(ticket.source)}</span>
                      <button className={`${dangerButton} min-h-9 px-3 py-1 text-xs`} onClick={() => deleteTicket(user, ticket.id)}>削除</button>
                    </div>
                  )) : <p className="text-slate-500">回数券はありません。</p>}
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-slate-700">単発付与<input className={`${inputClass} mt-2`} inputMode="numeric" pattern="[0-9]*" value={String(current.issueCount)} onChange={(e) => setValues({ ...values, [user.id]: { ...current, issueCount: Number(e.target.value.replace(/\D/g, "")) } })} /></label>
                    <label className="block text-sm font-bold text-slate-700">有効期限<input className={`${inputClass} mt-2`} type="date" min={todayIso()} value={current.expiresOn} onChange={(e) => setValues({ ...values, [user.id]: { ...current, expiresOn: e.target.value } })} /></label>
                  </div>
                  <button className={`${primaryButton} self-end`} onClick={() => issueTicket(user)}>発行</button>
                  <label className="block text-sm font-bold text-slate-700">毎月自動付与<input className={`${inputClass} mt-2`} inputMode="numeric" pattern="[0-9]*" value={String(current.monthlyLessonGrantCount)} onChange={(e) => setValues({ ...values, [user.id]: { ...current, monthlyLessonGrantCount: Number(e.target.value.replace(/\D/g, "")) } })} /></label>
                  <button className={`${primaryButton} self-end`} onClick={() => saveMonthlyGrant(user)}>保存</button>
                </div>
              </div>
            ) : null}
            {historyUserId === user.id ? (
              <div className="mt-4 space-y-3 border-t border-slate-950/10 pt-4">
                <h3 className="font-black text-slate-950">レッスン履歴</h3>
                {displayedHistoryLessons.length ? displayedHistoryLessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-lg bg-white p-3 ring-1 ring-slate-950/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-950">{formatDateJa(lesson.date)} {lesson.startAt.slice(11, 16)}-{lesson.endAt.slice(11, 16)}</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${lesson.date >= historyToday ? "bg-[#EAF6FD] text-[#015F96]" : "bg-slate-100 text-slate-600"}`}>{lesson.date >= historyToday ? "予約済み" : "実施済み"}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{lesson.memberName ? `${lesson.memberName} / ` : ""}{lesson.lessonFormat ? `${formatLessonFormat(lesson.lessonFormat)} / ` : ""}{getInstrumentLabel(lesson.instrument)}</div>
                  </div>
                )) : historyLoading ? null : <p className="text-sm text-slate-500">レッスン履歴はありません。</p>}
                {historyLoading ? <p className="text-sm font-bold text-slate-500">読み込み中です。</p> : null}
                {historyHasMore ? <button className={`${subtleButton} w-full`} disabled={historyLoading} onClick={() => void loadHistory(user, true)}>さらに表示</button> : null}
              </div>
            ) : null}
          </div>;
        }) : <p className="text-sm text-slate-500">該当するユーザーはありません。</p>}
      </div>
    </article>
  );
}
