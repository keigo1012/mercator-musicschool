"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { BookingCalendar } from "@/features/booking/booking-calendar";
import { bookingDateStatus, findEarliestAvailableDate, isBookingDateUnavailable } from "@/lib/lesson/availability";
import { bookingIdFromDateHour, buildBirthDate, formatSlotJa, isoDate, toTokyoParts, validateLessonDeadline } from "@/lib/lesson/dates";
import { DEFAULT_INSTRUMENT, getInstrumentLabel, INSTRUMENTS, isDefaultClosedLessonHour, LESSON_HOURS } from "@/lib/lesson/constants";
import type { LessonUser } from "@/lib/lesson/types";
import { expiryWarningTickets } from "@/lib/lesson/tickets";
import {
  apiFetch,
  applicationControl,
  applicationField,
  BookedLessonsCard,
  card,
  inputClass,
  LessonTicketWarning,
  primaryButton,
  selectedButton,
  subtleButton,
  unavailableSlotButton,
  type ApiState,
} from "./lesson-shared";

function todayIso() {
  const now = toTokyoParts();
  return isoDate(now.year, now.month, now.day);
}


function emptyMemberForm(name = "") {
  return { name, birthYear: "", birthMonth: "", birthDay: "" };
}


function memberFormFromDate(member: { name?: string; birthDate?: string }) {
  const [birthYear = "", birthMonth = "", birthDay = ""] = (member.birthDate ?? "").split("-");
  return {
    name: member.name ?? "",
    birthYear,
    birthMonth,
    birthDay,
  };
}


export function LessonPage({ authUser, state, refresh, setError, setNotice }: { authUser: User; state: ApiState; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const user = state.user!;
  if (user.isBlockedByAdmin) return <div className={card}><h2 className="text-xl font-black text-red-700">現在このアカウントは休会中です。</h2></div>;
  if (!user.hasLessonPlan && user.lessonApplicationStatus === "pending") return <PendingCard />;
  if (!user.hasLessonPlan) return <ApplicationCard authUser={authUser} user={user} refresh={refresh} setError={setError} setNotice={setNotice} />;
  if (user.lessonApplicationStatus !== "approved") return <PendingCard />;
  return <BookingPanel authUser={authUser} state={state} refresh={refresh} setError={setError} setNotice={setNotice} />;
}

function PendingCard() {
  return <article className={card}><h2 className="text-xl font-black text-slate-950">承認待ち</h2><p className="mt-3 leading-7 text-slate-700">会員登録を受け付けました。管理者の承認後に予約できるようになります。</p></article>;
}

function ApplicationCard({ authUser, user, refresh, setError, setNotice }: { authUser: User; user: LessonUser; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: user.lessonFullName ?? "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    memberCount: Math.max(1, Math.min(10, Number(user.lessonMemberCount ?? 1))),
    members: user.lessonMembers?.length ? user.lessonMembers.map(memberFormFromDate) : [emptyMemberForm(user.lessonFullName ?? "")],
    postalCode: "",
    address: "",
    phoneNumber: user.phoneNumber ?? "",
    email: user.email ?? "",
  });

  function setMemberCount(nextCount: number) {
    const memberCount = Math.max(1, Math.min(10, nextCount || 1));
    const members = Array.from({ length: memberCount }, (_, index) => form.members[index] ?? emptyMemberForm());
    setForm({ ...form, memberCount, members });
  }

  function setMember(index: number, key: "name" | "birthYear" | "birthMonth" | "birthDay", value: string) {
    const members = form.members.map((member, memberIndex) => (memberIndex === index ? { ...member, [key]: value } : member));
    setForm({ ...form, members });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const birthDate = buildBirthDate(form.birthYear, form.birthMonth, form.birthDay);
    if (!birthDate) {
      setError("生年月日を正しく入力してください。");
      return;
    }
    if (!form.fullName.trim()) {
      setError("氏名を入力してください。");
      return;
    }
    const normalizedMembers = form.members.map((member) => ({
      name: member.name.trim(),
      birthDate: buildBirthDate(member.birthYear, member.birthMonth, member.birthDay),
    }));
    if (form.memberCount >= 2 && (normalizedMembers.length !== form.memberCount || normalizedMembers.some((member) => !member.name || !member.birthDate))) {
      setError("登録人数分の氏名と生年月日を入力してください。");
      return;
    }
    const members = form.memberCount === 1 ? [{ name: form.fullName.trim(), birthDate }] : normalizedMembers;
    const submitForm = {
      ...form,
      birthDate,
      fullName: form.fullName.trim(),
      members,
    };
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/lesson-applications/", authUser, { method: "POST", body: JSON.stringify(submitForm) });
      setNotice("会員登録を受け付けました。管理者の承認後に予約できるようになります。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "会員登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`${card} max-w-3xl`}>
      <h2 className="text-xl font-black text-slate-950">会員登録</h2>
      <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-bold text-slate-700">生年月日</p>
          <div className="mt-2 grid max-w-[15.5rem] grid-cols-[minmax(0,5.5rem)_minmax(0,4rem)_minmax(0,4rem)] gap-2">
            <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">年</span><input className={inputClass} inputMode="numeric" placeholder="年" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} required /></label>
            <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">月</span><input className={inputClass} inputMode="numeric" placeholder="月" value={form.birthMonth} onChange={(e) => setForm({ ...form, birthMonth: e.target.value })} required /></label>
            <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">日</span><input className={inputClass} inputMode="numeric" placeholder="日" value={form.birthDay} onChange={(e) => setForm({ ...form, birthDay: e.target.value })} required /></label>
          </div>
        </div>
        <label className={applicationField}>
          氏名(申込者の氏名)
          <input className={applicationControl} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </label>
        <label className={applicationField}>
          受講人数
          <select className={`${applicationControl} appearance-none`} value={form.memberCount} onChange={(e) => setMemberCount(Number(e.target.value))} required>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>{count}名</option>
            ))}
          </select>
        </label>
        {form.memberCount >= 2 ? (
          <div className="grid gap-4 rounded-lg bg-[#f7fbfa] p-4 md:col-span-2 md:grid-cols-2">
            {form.members.map((member, index) => (
              <div key={index} className="grid gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-950/10">
                <p className="text-sm font-black text-slate-800">受講者{index + 1}</p>
                <label className="block text-sm font-bold text-slate-700">氏名<input className={`${inputClass} mt-2`} value={member.name} onChange={(e) => setMember(index, "name", e.target.value)} required /></label>
                <div>
                  <p className="text-sm font-bold text-slate-700">生年月日</p>
                  <div className="mt-2 grid max-w-[15.5rem] grid-cols-[minmax(0,5.5rem)_minmax(0,4rem)_minmax(0,4rem)] gap-2">
                    <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">年</span><input className={inputClass} inputMode="numeric" placeholder="年" value={member.birthYear} onChange={(e) => setMember(index, "birthYear", e.target.value)} required /></label>
                    <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">月</span><input className={inputClass} inputMode="numeric" placeholder="月" value={member.birthMonth} onChange={(e) => setMember(index, "birthMonth", e.target.value)} required /></label>
                    <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">日</span><input className={inputClass} inputMode="numeric" placeholder="日" value={member.birthDay} onChange={(e) => setMember(index, "birthDay", e.target.value)} required /></label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {[
          ["postalCode", "郵便番号"], ["address", "住所"], ["phoneNumber", "電話番号"], ["email", "メールアドレス"],
        ].map(([key, label]) => (
          <label key={key} className={applicationField}>
            {label}
            <input className={applicationControl} type={key === "email" ? "email" : "text"} value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          </label>
        ))}
        <div className="flex gap-3 md:col-span-2">
          <button className={primaryButton} disabled={busy}>{busy ? "送信中" : "会員登録を送信"}</button>
          <button type="button" className={subtleButton} onClick={() => window.history.back()}>戻る</button>
        </div>
      </form>
    </article>
  );
}

function BookingPanel({ authUser, state, refresh, setError, setNotice }: { authUser: User; state: ApiState; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const didAutoSelectInitialDate = useRef(false);
  const user = state.user!;
  const expiringTickets = expiryWarningTickets(user.lessonTickets ?? []);
  const members = user.lessonMembers ?? [];
  const initialMemberName = members[0]?.name ?? "";
  const bookingIds = useMemo(() => new Set(state.bookings.map((booking) => booking.id)), [state.bookings]);
  const closedById = useMemo(() => new Map(state.closedDays.map((closed) => [closed.id, closed])), [state.closedDays]);
  const earliestBookableDate = useMemo(() => findEarliestAvailableDate(bookingIds, closedById), [bookingIds, closedById]);
  const initialDate = earliestBookableDate || todayIso();
  const [month, setMonth] = useState({ year: Number(initialDate.slice(0, 4)), month: Number(initialDate.slice(5, 7)) });
  const [selectedDate, setSelectedDate] = useState(earliestBookableDate);
  const [lessonFormat, setLessonFormat] = useState<"inPerson" | "online">("inPerson");
  const [instrument, setInstrument] = useState(user.selectedLessonInstrument || DEFAULT_INSTRUMENT);
  const [memberName, setMemberName] = useState(initialMemberName);
  const [busy, setBusy] = useState("");
  const ownBookingIds = useMemo(() => new Set(state.bookings.filter((booking) => booking.isOwn).map((booking) => booking.id)), [state.bookings]);
  const bookingById = useMemo(() => new Map(state.bookings.map((booking) => [booking.id, booking])), [state.bookings]);
  const isDateUnavailable = useCallback((date: string) => isBookingDateUnavailable(date, bookingIds, closedById), [bookingIds, closedById]);
  const getDateStatus = useCallback((date: string) => bookingDateStatus(date, bookingIds, closedById), [bookingIds, closedById]);

  useEffect(() => {
    if (!earliestBookableDate || didAutoSelectInitialDate.current) return;
    didAutoSelectInitialDate.current = true;
    if (selectedDate && !isDateUnavailable(selectedDate)) return;
    const timer = window.setTimeout(() => {
      setSelectedDate(earliestBookableDate);
      setMonth({ year: Number(earliestBookableDate.slice(0, 4)), month: Number(earliestBookableDate.slice(5, 7)) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [earliestBookableDate, isDateUnavailable, selectedDate]);

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(month.year, month.month - 1 + offset, 1));
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
    setSelectedDate("");
  }

  async function createBooking(date: string, hour: number) {
    if (members.length >= 2 && !memberName) {
      setError("予約する会員名を選択してください。");
      return;
    }
    const selectedMemberLabel = memberName ? `\n会員名：${memberName}` : "";
    if (!confirm(`予約を確定しますか？\n${formatSlotJa(date, hour)}を${lessonFormat === "online" ? "オンライン" : "対面"} / ${getInstrumentLabel(instrument)}で予約します。${selectedMemberLabel}`)) return;
    setBusy(`${date}-${hour}`);
    setError("");
    try {
      await apiFetch("/api/lesson-bookings/", authUser, { method: "POST", body: JSON.stringify({ instrument, lessonFormat, date, hour, memberName }) });
      setNotice("予約が完了しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約に失敗しました。");
    } finally {
      setBusy("");
    }
  }

  async function cancelBooking(booking: { id: string; date: string; startAt: string }) {
    const hour = Number(booking.startAt.slice(11, 13));
    if (!confirm(`予約をキャンセルしますか？\n${formatSlotJa(booking.date, hour)}の予約をキャンセルします。`)) return;
    setBusy(booking.id);
    setError("");
    try {
      await apiFetch(`/api/lesson-bookings/${booking.id}/`, authUser, { method: "DELETE" });
      setNotice("予約をキャンセルしました。残り回数を1回戻しました。");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "キャンセルに失敗しました。");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <article className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">予約内容</h2>
            <div className="rounded-full bg-[#fff4e6] px-4 py-2 text-sm font-black text-[#b45309]">残りレッスン {user.remainingLessons ?? 0}回</div>
          </div>
          {expiringTickets.length ? <LessonTicketWarning tickets={expiringTickets} /> : null}
          {members.length >= 2 ? (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-700">予約する会員名</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <button
                    key={`${member.name}-${member.birthDate}`}
                    type="button"
                    className={memberName === member.name ? selectedButton : subtleButton}
                    onClick={() => {
                      setMemberName(member.name);
                    }}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <h3 className="text-sm font-bold text-slate-700">受講形式</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button type="button" className={lessonFormat === "inPerson" ? selectedButton : subtleButton} onClick={() => setLessonFormat("inPerson")}>対面</button>
              <button type="button" className={lessonFormat === "online" ? selectedButton : subtleButton} onClick={() => setLessonFormat("online")}>オンライン</button>
            </div>
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-700">予約する楽器</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {INSTRUMENTS.map((item) => <button key={item.id} className={instrument === item.id ? selectedButton : subtleButton} onClick={() => setInstrument(item.id)}>{item.label}</button>)}
          </div>
        </article>
        <article className={card}><BookingCalendar month={month} selectedDate={selectedDate} onMoveMonth={moveMonth} onSelectDate={setSelectedDate} isDateUnavailable={isDateUnavailable} getDateStatus={getDateStatus} buttonClassName={subtleButton} /></article>
        {selectedDate ? (
          <article className={card}>
            <h2 className="text-xl font-black text-slate-950">{Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(8, 10))}日の予約枠</h2>
            <div className="mt-4 grid gap-2">
              {LESSON_HOURS.map((hour) => {
                const id = bookingIdFromDateHour(selectedDate, hour);
                const booking = bookingById.get(id);
                const isOwn = ownBookingIds.has(id);
                const closed = closedById.has(selectedDate.replaceAll("-", "")) || closedById.has(id);
                const defaultUnavailable = isDefaultClosedLessonHour(hour);
                const deadlineError = validateLessonDeadline(selectedDate);
                const disabled = Boolean(closed || (!isOwn && (booking || defaultUnavailable)) || deadlineError || user.remainingLessons <= 0 || busy);
                const label = isOwn && !deadlineError ? "予約済み" : disabled ? "予約不可" : "予約可";
                return <button key={id} disabled={isOwn ? Boolean(deadlineError || busy) : disabled} onClick={() => isOwn && booking ? cancelBooking(booking) : createBooking(selectedDate, hour)} className={`${label === "予約不可" ? unavailableSlotButton : isOwn ? primaryButton : subtleButton} justify-between rounded-lg`}>
                  <span>{hour}:00-{hour + 1}:00 {busy === id || busy === `${selectedDate}-${hour}` ? "処理中" : label}</span>
                </button>;
              })}
            </div>
          </article>
        ) : null}
      </div>
      <BookedLessonsCard key={`${user.id}-${user.updatedAt ?? ""}`} authUser={authUser} onCancel={cancelBooking} />
    </div>
  );
}
