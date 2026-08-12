"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { buildMonthDays, bookingIdFromDateHour, formatBirthDateWithAgeAndGrade, formatDateJa, formatSlotJa, isoDate, isValidBirthDate, monthEndAfterMonths, toTokyoParts, validateLessonDeadline } from "@/lib/lesson/dates";
import { DEFAULT_INSTRUMENT, getInstrumentLabel, INSTRUMENTS, isDefaultClosedLessonHour, LESSON_HOURS } from "@/lib/lesson/constants";
import type { BookedLesson, LessonApplication, LessonBooking, LessonClosedDay, LessonUser } from "@/lib/lesson/types";
import { expiryWarningTickets } from "@/lib/lesson/tickets";

type Mode = "mypage" | "lesson" | "admin";
type ApiState = {
  user: LessonUser | null;
  bookings: LessonBooking[];
  closedDays: LessonClosedDay[];
};
type AdminBookingTab = "new" | "future" | "past";
type LessonListTab = "upcoming" | "past";
type LessonListPage = {
  lessons: BookedLesson[];
  cursor: { value: string; id: string } | null;
  hasMore: boolean;
  loaded: boolean;
};

const card = "rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-full bg-[#0176BA] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#015F96] disabled:cursor-not-allowed disabled:bg-slate-300";
const subtleButton = "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-950/18 bg-white px-5 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400";
const selectedButton = "inline-flex min-h-11 items-center justify-center rounded-full border border-[#0176BA] bg-[#0176BA] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#015F96] disabled:cursor-not-allowed disabled:bg-slate-300";
const dangerButton = "inline-flex min-h-11 items-center justify-center rounded-full bg-[#d32f2f] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#b71c1c] disabled:cursor-not-allowed disabled:bg-slate-300";
const unavailableSlotButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-950/10 bg-slate-100 px-5 py-2 text-sm font-bold text-slate-400 disabled:cursor-not-allowed";
const inputClass = "min-h-11 w-full rounded-lg border border-slate-950/18 bg-white px-3 py-2 text-sm outline-none focus:border-[#0176BA] focus:ring-2 focus:ring-[#0176BA]/15";
const applicationField = "block min-w-0 text-sm font-bold text-slate-700 md:col-span-2";
const applicationControl = `${inputClass} mt-2 block w-full`;

function todayIso() {
  const now = toTokyoParts();
  return isoDate(now.year, now.month, now.day);
}

function defaultTicketExpiry() {
  return monthEndAfterMonths(6);
}

function formatTicketSource(source: string) {
  if (source === "monthly") return "月次付与";
  return "管理者発行";
}

function formatBookingInstrument(booking: Pick<LessonBooking, "bookingType" | "instrument">) {
  const label = getInstrumentLabel(booking.instrument);
  return booking.bookingType === "trial" ? `体験レッスン：${label}` : label;
}

function formatLessonFormat(value?: string) {
  return value === "online" ? "オンライン" : value === "inPerson" ? "対面" : "";
}

function formatLessonMember(member: NonNullable<LessonUser["lessonMembers"]>[number], showGrade = false) {
  return `${member.name} (${showGrade ? formatBirthDateWithAgeAndGrade(member.birthDate) : member.birthDate})`;
}

function lessonUserSearchText(user: LessonUser) {
  return [
    user.name,
    user.email,
    user.lessonEmail,
    user.lessonFullName,
    user.lessonBirthDate,
    user.lessonPhoneNumber,
    user.phoneNumber,
    user.lessonAddress,
    ...(user.lessonMembers ?? []).flatMap((member) => [member.name, member.birthDate]),
  ].join(" ").toLowerCase();
}

function lessonUserMemberTotal(users: LessonUser[]) {
  return users.reduce((total, user) => total + Math.max(1, Number(user.lessonMemberCount ?? user.lessonMembers?.length ?? 1)), 0);
}

function lessonUserSortName(user: LessonUser) {
  return user.lessonFullName ?? "";
}

function bookingCreatedAtValue(booking: LessonBooking) {
  return booking.createdAt || booking.startAt;
}

function buildBirthDate(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) {
    return "";
  }
  const value = new Date(Date.UTC(y, m - 1, d));
  if (value.getUTCFullYear() !== y || value.getUTCMonth() + 1 !== m || value.getUTCDate() !== d) {
    return "";
  }

  const date = isoDate(y, m, d);
  return isValidBirthDate(date) ? date : "";
}

function emptyMemberForm(name = "") {
  return { name, birthYear: "", birthMonth: "", birthDay: "" };
}

function firebaseErrorMessage(caught: unknown, fallback: string) {
  const firebaseCode = typeof caught === "object" && caught !== null && "code" in caught ? String(caught.code) : "";
  const message = caught instanceof Error ? caught.message : fallback;
  return firebaseCode ? `${message} (${firebaseCode})` : message;
}

function firebaseErrorCode(caught: unknown) {
  return typeof caught === "object" && caught !== null && "code" in caught ? String(caught.code) : "";
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

function findEarliestBookableLessonDate(bookings: LessonBooking[], closedDays: LessonClosedDay[]) {
  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const closedById = new Map(closedDays.map((closed) => [closed.id, closed]));
  const now = toTokyoParts();
  const max = new Date(Date.UTC(now.year, now.month - 1, now.day));
  max.setUTCMonth(max.getUTCMonth() + 2);

  for (let value = new Date(Date.UTC(now.year, now.month - 1, now.day + 1)); value <= max; value.setUTCDate(value.getUTCDate() + 1)) {
    const date = isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) continue;
    const hasAvailableHour = LESSON_HOURS.some((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return !isDefaultClosedLessonHour(hour) && !bookingIds.has(slotId) && !closedById.has(slotId);
    });
    if (hasAvailableHour) return date;
  }

  return "";
}

async function apiFetch<T>(path: string, authUser: User, init: RequestInit = {}): Promise<T> {
  const token = await authUser.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "処理に失敗しました。");
  }
  return data as T;
}

export function LessonPortal({ mode }: { mode: Mode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [state, setState] = useState<ApiState>({ user: null, bookings: [], closedDays: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let settled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (settled) return;
      setError("ログイン状態の確認に時間がかかっています。ページを再読み込みしてください。");
      setAuthReady(true);
    }, 8000);
    try {
      const nextAuth = getFirebaseAuth();
      void getRedirectResult(nextAuth).catch((caught) => {
        setError(firebaseErrorMessage(caught, "Googleログインに失敗しました。"));
      });
      const unsubscribe = onAuthStateChanged(nextAuth, (nextUser) => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setAuthUser(nextUser);
        setAuthReady(true);
      });
      return () => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch {
      window.setTimeout(() => {
        settled = true;
        window.clearTimeout(fallbackTimer);
        setError("Firebaseの初期化に失敗しました。");
        setAuthReady(true);
      }, 0);
      return () => {
        settled = true;
        window.clearTimeout(fallbackTimer);
      };
    }
  }, []);

  const refresh = useCallback(async (target: Mode = mode) => {
    if (!authUser) return;
    setLoading(true);
    setError("");
    try {
      const me = await apiFetch<{ user: LessonUser }>("/api/me/", authUser);
      const next: ApiState = { user: me.user, bookings: [], closedDays: [] };
      if (target === "lesson") {
        next.bookings = (await apiFetch<{ bookings: LessonBooking[] }>("/api/lesson-bookings/", authUser)).bookings;
      }
      if (target === "lesson") {
        next.closedDays = (await apiFetch<{ closedDays: LessonClosedDay[] }>("/api/lesson-closed-days/", authUser)).closedDays;
      }
      setState(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [authUser, mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authUser) void refresh();
      if (!authUser) setState({ user: null, bookings: [], closedDays: [] });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authUser, mode, refresh]);

  if (!authReady) {
    return <PortalShell title={mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ"}><p className={card}>読み込み中です。</p></PortalShell>;
  }

  if (!authUser) {
    return <PortalShell title={mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ"}><AuthPanel onError={setError} error={error} /></PortalShell>;
  }

  const title = mode === "admin" ? "管理" : mode === "lesson" ? "レッスン" : "マイページ";
  const displayName = state.user?.lessonFullName || state.user?.name || "氏名未登録";
  const displayEmail = state.user?.lessonEmail || state.user?.email || authUser.email || "";

  async function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    await signOut(getFirebaseAuth());
  }

  return (
    <PortalShell title={title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-bold text-slate-700">
          <span>{displayName}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-600">{displayEmail}</span>
        </div>
        <div className="flex flex-wrap gap-2">
        </div>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-lg bg-[#EAF6FD] px-4 py-3 text-sm font-bold text-[#015F96]">{notice}</p> : null}
      {loading && <p className="mb-4 text-sm font-bold text-slate-500">更新中です。</p>}
      {mode === "mypage" && state.user ? <MyPage authUser={authUser} user={state.user} /> : null}
      {mode === "lesson" && state.user ? <LessonPage authUser={authUser} state={state} refresh={() => refresh("lesson")} setError={setError} setNotice={setNotice} /> : null}
      {mode === "admin" && state.user ? <AdminPage authUser={authUser} state={state} setError={setError} setNotice={setNotice} /> : null}
      <div className="mt-8 flex justify-center border-t border-slate-950/10 pt-6">
        <button className={subtleButton} onClick={handleLogout}>ログアウト</button>
      </div>
    </PortalShell>
  );
}

function PortalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="portal-shell bg-white px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="page-heading luxury-heading luxury-heading-rule mx-auto max-w-4xl">{title}</h1>
          <div className="luxury-heading-accent mx-auto mt-5" />
        </div>
        {children}
      </div>
    </section>
  );
}

function AuthPanel({ onError, error }: { onError: (message: string) => void; error: string }) {
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    onError("");
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (caught) {
      const code = firebaseErrorCode(caught);
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          onError(firebaseErrorMessage(redirectError, "Googleログインに失敗しました。"));
        }
        return;
      }
      onError(firebaseErrorMessage(caught, "Googleログインに失敗しました。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${card} mx-auto max-w-md space-y-4`}>
      <h2 className="panel-heading font-black text-slate-950">ログイン</h2>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
      <button type="button" className={`${primaryButton} w-full`} onClick={signInWithGoogle} disabled={busy}>
        {busy ? "処理中" : "Googleでログイン"}
      </button>
    </div>
  );
}

function MyPage({ authUser, user }: { authUser: User; user: LessonUser }) {
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

function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 rounded-lg bg-[#f7fbfa] p-3"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="font-bold text-slate-900">{value}</dd></div>;
}

function LessonTicketWarning({ tickets }: { tickets: NonNullable<LessonUser["lessonTickets"]> }) {
  return (
    <div className="mt-4 rounded-lg border border-[#f5c26b] bg-[#fff4e6] px-4 py-3 text-sm text-[#92400e]">
      <p className="font-bold">有効期限が1ヶ月以内のチケットがあります</p>
      <div className="mt-2 space-y-1">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="flex flex-wrap justify-between gap-x-4">
            <span>{ticket.count}回</span>
            <span>有効期限 {ticket.expiresOn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonPage({ authUser, state, refresh, setError, setNotice }: { authUser: User; state: ApiState; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
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
  const earliestBookableDate = useMemo(() => findEarliestBookableLessonDate(state.bookings, state.closedDays), [state.bookings, state.closedDays]);
  const initialDate = earliestBookableDate || todayIso();
  const [month, setMonth] = useState({ year: Number(initialDate.slice(0, 4)), month: Number(initialDate.slice(5, 7)) });
  const [selectedDate, setSelectedDate] = useState(earliestBookableDate);
  const [lessonFormat, setLessonFormat] = useState<"inPerson" | "online">("inPerson");
  const [instrument, setInstrument] = useState(user.selectedLessonInstrument || DEFAULT_INSTRUMENT);
  const [memberName, setMemberName] = useState(initialMemberName);
  const [busy, setBusy] = useState("");
  const cells = useMemo(() => buildMonthDays(month.year, month.month), [month]);
  const ownBookingIds = useMemo(() => new Set(state.bookings.filter((booking) => booking.isOwn).map((booking) => booking.id)), [state.bookings]);
  const bookingById = useMemo(() => new Map(state.bookings.map((booking) => [booking.id, booking])), [state.bookings]);
  const closedById = useMemo(() => new Map(state.closedDays.map((closed) => [closed.id, closed])), [state.closedDays]);

  const isDateUnavailable = useCallback((date: string) => {
    if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) return true;
    return LESSON_HOURS.every((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return isDefaultClosedLessonHour(hour) || bookingById.has(slotId) || closedById.has(slotId);
    });
  }, [bookingById, closedById]);

  const getDateStatus = useCallback((date: string) => {
    if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) {
      return "×";
    }
    const selectableHours = LESSON_HOURS.filter((hour) => !isDefaultClosedLessonHour(hour));
    const availableCount = selectableHours.filter((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return !bookingById.has(slotId) && !closedById.has(slotId);
    }).length;

    if (availableCount === 0) return "×";
    if (availableCount === selectableHours.length) return "○";
    return "△";
  }, [bookingById, closedById]);

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
        <article className={card}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button className={subtleButton} onClick={() => moveMonth(-1)}>前月</button>
            <h2 className="text-lg font-black text-slate-950">{month.year}年{month.month}月</h2>
            <button className={subtleButton} onClick={() => moveMonth(1)}>翌月</button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">{["日", "月", "火", "水", "木", "金", "土"].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const disabled = !cell.date;
              const unavailable = cell.date ? isDateUnavailable(cell.date) : false;
              const status = cell.date ? getDateStatus(cell.date) : "";
              return <button key={cell.key} disabled={disabled} onClick={() => cell.date && setSelectedDate(cell.date)} className={`min-h-14 rounded-lg border p-1 text-sm font-bold ${cell.date === selectedDate ? "border-[#0176BA] bg-[#EAF6FD]" : unavailable ? "border-slate-950/10 bg-slate-100 text-slate-400" : "border-slate-950/10 bg-white"} disabled:bg-slate-100 disabled:text-slate-300`}>
                {cell.day}<span className="mt-1 block text-xs leading-none">{status}</span>
              </button>;
            })}
          </div>
        </article>
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

function emptyLessonListPage(): LessonListPage {
  return { lessons: [], cursor: null, hasMore: false, loaded: false };
}

function BookedLessonsCard({ authUser, onCancel }: { authUser: User; onCancel?: (booking: BookedLesson) => void }) {
  const [selectedTab, setSelectedTab] = useState<LessonListTab>("upcoming");
  const [now, setNow] = useState(() => new Date());
  const [pages, setPages] = useState<Record<LessonListTab, LessonListPage>>({ upcoming: emptyLessonListPage(), past: emptyLessonListPage() });
  const [loadingTab, setLoadingTab] = useState<LessonListTab | null>(null);
  const [listError, setListError] = useState("");

  const loadLessons = useCallback(async (tab: LessonListTab, append = false) => {
    const currentPage = pages[tab];
    if (loadingTab || (append && !currentPage.hasMore)) return;
    setLoadingTab(tab);
    setListError("");
    try {
      const params = new URLSearchParams({ tab });
      if (append && currentPage.cursor) {
        params.set("cursor", currentPage.cursor.value);
        params.set("cursorId", currentPage.cursor.id);
      }
      const data = await apiFetch<{ lessons: BookedLesson[]; cursor: { value: string; id: string } | null; hasMore: boolean }>(`/api/my-lessons/?${params}`, authUser);
      setPages((current) => ({
        ...current,
        [tab]: {
          lessons: append ? [...current[tab].lessons, ...data.lessons] : data.lessons,
          cursor: data.cursor,
          hasMore: data.hasMore,
          loaded: true,
        },
      }));
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "レッスン履歴の取得に失敗しました。");
    } finally {
      setLoadingTab(null);
    }
  }, [authUser, loadingTab, pages]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLessons("upcoming"), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lessons = pages[selectedTab].lessons;

  function selectTab(tab: LessonListTab) {
    setSelectedTab(tab);
    if (!pages[tab].loaded) void loadLessons(tab);
  }

  return (
    <article className={card}>
      <h2 className="text-xl font-black text-slate-950">予約済みレッスン</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={selectedTab === "upcoming" ? selectedButton : subtleButton} onClick={() => selectTab("upcoming")}>今後</button>
        <button className={selectedTab === "past" ? selectedButton : subtleButton} onClick={() => selectTab("past")}>過去</button>
      </div>
      <div className="mt-4 space-y-3">
        {listError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{listError}</p> : null}
        {lessons.length ? lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-lg bg-[#f7fbfa] p-3">
            <div className="font-bold text-slate-950">{formatDateJa(lesson.date)} {lesson.startAt.slice(11, 16)}-{lesson.endAt.slice(11, 16)}</div>
            <div className="mt-1 text-sm text-slate-600">{lesson.memberName ? `${lesson.memberName} / ` : ""}{lesson.lessonFormat ? `${formatLessonFormat(lesson.lessonFormat)} / ` : ""}{getInstrumentLabel(lesson.instrument)}</div>
            {onCancel && !validateLessonDeadline(lesson.date, now) ? <button className={`${dangerButton} mt-3`} onClick={() => onCancel(lesson)}>キャンセル</button> : null}
          </div>
        )) : pages[selectedTab].loaded && loadingTab !== selectedTab ? <p className="text-sm text-slate-500">{selectedTab === "upcoming" ? "今後の予約はありません" : "過去のレッスンはありません"}</p> : null}
        {loadingTab === selectedTab ? <p className="text-sm font-bold text-slate-500">読み込み中です。</p> : null}
        {pages[selectedTab].loaded && pages[selectedTab].hasMore ? (
          <button className={`${subtleButton} w-full`} disabled={Boolean(loadingTab)} onClick={() => void loadLessons(selectedTab, true)}>さらに表示</button>
        ) : null}
      </div>
    </article>
  );
}

function AdminPage({ authUser, state, setError, setNotice }: { authUser: User; state: ApiState; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [tab, setTab] = useState<"lesson" | "applications" | "members">("lesson");
  const [openedTabs, setOpenedTabs] = useState<Set<"lesson" | "applications" | "members">>(() => new Set(["lesson"]));
  const [memberUsers, setMemberUsers] = useState<LessonUser[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [applications, setApplications] = useState<LessonApplication[]>([]);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const loadMemberUsers = useCallback(async () => {
    if (membersLoading) return;
    setMembersLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ users: LessonUser[] }>("/api/admin/users/", authUser);
      setMemberUsers(data.users);
      setMembersLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "会員情報の読み込みに失敗しました。");
    } finally {
      setMembersLoading(false);
    }
  }, [authUser, membersLoading, setError]);
  const loadApplications = useCallback(async () => {
    if (applicationsLoading) return;
    setApplicationsLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ applications: LessonApplication[] }>("/api/admin/lesson-applications/", authUser);
      setApplications(data.applications);
      setApplicationsLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "申込情報の読み込みに失敗しました。");
    } finally {
      setApplicationsLoading(false);
    }
  }, [applicationsLoading, authUser, setError]);
  if (!state.user?.isAdmin) return <article className={card}><h2 className="text-xl font-black text-red-700">管理者権限がありません</h2></article>;
  function selectAdminTab(nextTab: "lesson" | "applications" | "members") {
    setTab(nextTab);
    setOpenedTabs((current) => current.has(nextTab) ? current : new Set(current).add(nextTab));
    if (nextTab === "applications" && !applicationsLoaded) void loadApplications();
    if (nextTab === "members" && !membersLoaded) void loadMemberUsers();
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{[["lesson", "レッスン"], ["applications", "申込承認"], ["members", "会員管理"]].map(([id, label]) => <button key={id} className={`${subtleButton} ${tab === id ? "border-[#0176BA] bg-[#EAF6FD] text-[#015F96]" : ""}`} onClick={() => selectAdminTab(id as typeof tab)}>{label}</button>)}</div>
      <div hidden={tab !== "lesson"}>
        <AdminLessonTab authUser={authUser} setError={setError} setNotice={setNotice} />
      </div>
      {openedTabs.has("applications") ? (
        <div hidden={tab !== "applications"}>
          {applicationsLoading && !applicationsLoaded ? <article className={card}><p className="text-sm font-bold text-slate-500">申込情報を読み込み中です。</p></article> : <AdminApplications authUser={authUser} applications={applications} refresh={loadApplications} setError={setError} setNotice={setNotice} />}
        </div>
      ) : null}
      {openedTabs.has("members") ? (
        <div hidden={tab !== "members"}>
          {membersLoading && !membersLoaded ? <article className={card}><p className="text-sm font-bold text-slate-500">会員情報を読み込み中です。</p></article> : <AdminMemberUsers authUser={authUser} users={memberUsers} refresh={loadMemberUsers} setError={setError} setNotice={setNotice} />}
        </div>
      ) : null}
    </div>
  );
}

function AdminLessonTab({ authUser, setError, setNotice }: { authUser: User; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const now = toTokyoParts();
  const [month, setMonth] = useState({ year: now.year, month: now.month });
  const [selectedDate, setSelectedDate] = useState("");
  const [bookingTab, setBookingTab] = useState<AdminBookingTab>("new");
  const initialBookingLoad = useRef(false);
  const calendarCacheRef = useRef<Record<string, { bookings: LessonBooking[]; closedDays: LessonClosedDay[] }>>({});
  const [calendarDataByMonth, setCalendarDataByMonth] = useState<Record<string, { bookings: LessonBooking[]; closedDays: LessonClosedDay[] }>>({});
  const [bookingData, setBookingData] = useState<Record<AdminBookingTab, { bookings: LessonBooking[]; cursors: Record<string, { value: string; id: string } | null>; hasMore: boolean; loaded: boolean }>>({
    new: { bookings: [], cursors: {}, hasMore: false, loaded: false },
    future: { bookings: [], cursors: {}, hasMore: false, loaded: false },
    past: { bookings: [], cursors: {}, hasMore: false, loaded: false },
  });
  const cells = useMemo(() => buildMonthDays(month.year, month.month), [month]);
  const today = todayIso();
  const bookings = bookingData[bookingTab].bookings
    .filter((booking) => bookingTab === "new" || (bookingTab === "future" ? booking.date >= today : booking.date < today))
    .sort((a, b) => {
      if (bookingTab === "new") return bookingCreatedAtValue(b).localeCompare(bookingCreatedAtValue(a));
      return bookingTab === "future" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt);
    });
  const visibleBookings = bookings;
  const hasMoreBookings = bookingData[bookingTab].hasMore;
  const calendarMonthKey = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const calendarBookings = calendarDataByMonth[calendarMonthKey]?.bookings ?? [];
  const calendarClosedDays = calendarDataByMonth[calendarMonthKey]?.closedDays ?? [];
  const closedById = new Map(calendarClosedDays.map((closed) => [closed.id, closed]));
  const bookingById = new Map(calendarBookings.map((booking) => [booking.id, booking]));

  const loadCalendarBookings = useCallback(async (targetMonth = month, force = false) => {
    const key = `${targetMonth.year}-${String(targetMonth.month).padStart(2, "0")}`;
    if (!force && calendarCacheRef.current[key]) return;
    try {
      const [bookingData, closedDayData] = await Promise.all([
        apiFetch<{ bookings: LessonBooking[] }>(`/api/admin/bookings/?mode=calendar&month=${key}`, authUser),
        apiFetch<{ closedDays: LessonClosedDay[] }>(`/api/admin/closed-days/?month=${key}`, authUser),
      ]);
      const nextMonthData = { bookings: bookingData.bookings, closedDays: closedDayData.closedDays };
      calendarCacheRef.current[key] = nextMonthData;
      setCalendarDataByMonth((current) => ({ ...current, [key]: nextMonthData }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約カレンダーの読み込みに失敗しました。");
    }
  }, [authUser, month, setError]);

  const loadBookingPage = useCallback(async (tab: AdminBookingTab, append = false) => {
    const current = bookingData[tab];
    try {
      const params = new URLSearchParams({ tab });
      if (append) {
        for (const [key, cursor] of Object.entries(current.cursors)) {
          if (cursor) {
            params.set(`${key}Cursor`, cursor.value);
            params.set(`${key}CursorId`, cursor.id);
          }
        }
      }
      const data = await apiFetch<{ bookings: LessonBooking[]; cursors: Record<string, { value: string; id: string } | null>; hasMore: boolean }>(`/api/admin/bookings/?${params}`, authUser);
      setBookingData((items) => ({ ...items, [tab]: { bookings: append ? [...items[tab].bookings, ...data.bookings] : data.bookings, cursors: data.cursors, hasMore: data.hasMore, loaded: true } }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約一覧の読み込みに失敗しました。");
    }
  }, [authUser, bookingData, setError]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCalendarBookings(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCalendarBookings]);
  useEffect(() => {
    if (initialBookingLoad.current) return;
    initialBookingLoad.current = true;
    const timer = window.setTimeout(() => { void loadBookingPage("new"); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBookingPage]); // 初回は新着8件のみ取得

  async function call(path: string, init: RequestInit) {
    setError("");
    try {
      await apiFetch(path, authUser, init);
      setNotice("更新しました。");
      await Promise.all([loadCalendarBookings(month, true), loadBookingPage(bookingTab)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新に失敗しました。");
    }
  }

  async function refreshLessonBookings() {
    setError("");
    await Promise.all([loadCalendarBookings(month, true), loadBookingPage(bookingTab)]);
    setNotice("予約情報を更新しました。");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <article className={card}>
          <div className="mb-4 flex items-center justify-between"><button className={subtleButton} onClick={() => setMonth((m) => ({ year: m.month === 1 ? m.year - 1 : m.year, month: m.month === 1 ? 12 : m.month - 1 }))}>前月</button><h2 className="font-black">{month.year}年{month.month}月</h2><button className={subtleButton} onClick={() => setMonth((m) => ({ year: m.month === 12 ? m.year + 1 : m.year, month: m.month === 12 ? 1 : m.month + 1 }))}>翌月</button></div>
          <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">{["日", "月", "火", "水", "木", "金", "土"].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{cells.map((cell) => {
            const dayId = cell.date?.replaceAll("-", "") ?? "";
            const dayClosed = closedById.get(dayId);
            const slotClosed = calendarClosedDays.some((closed) => closed.date === cell.date && closed.scope === "slot");
            const hasBooking = calendarBookings.some((booking) => booking.date === cell.date);
            return <button key={cell.key} disabled={!cell.date} onClick={() => cell.date && setSelectedDate(cell.date)} className={`min-h-16 rounded-lg border p-1 text-sm font-bold ${selectedDate === cell.date ? "border-orange-300 bg-orange-50" : "border-slate-950/10 bg-white"} disabled:bg-slate-100`}><span>{cell.day}</span><span className="mt-1 block text-xs leading-none">{cell.date ? hasBooking ? "●" : dayClosed ? "×" : slotClosed ? "△" : "○" : ""}</span></button>;
          })}</div>
        </article>
        <article className={card}>
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">{Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(8, 10))}日</h2>
                <button
                  className={`${closedById.has(selectedDate.replaceAll("-", "")) ? primaryButton : dangerButton} min-h-10 px-4 py-1.5 text-xs`}
                  onClick={() => closedById.has(selectedDate.replaceAll("-", "")) ? call(`/api/admin/closed-days/day/${selectedDate.replaceAll("-", "")}/`, { method: "DELETE" }) : call("/api/admin/closed-days/day/", { method: "POST", body: JSON.stringify({ date: selectedDate }) })}
                >
                  {closedById.has(selectedDate.replaceAll("-", "")) ? "1日休業を解除" : "1日休業に設定"}
                </button>
              </div>
              <div className="mt-4 space-y-2">{LESSON_HOURS.map((hour) => {
                const id = bookingIdFromDateHour(selectedDate, hour);
                const booking = bookingById.get(id);
                const dayClosed = closedById.has(selectedDate.replaceAll("-", ""));
                const slotClosed = closedById.has(id);
                const closedCardClass = booking
                  ? "border-[#0176BA]/30 bg-[#EAF6FD]"
                  : dayClosed
                    ? "border-red-200 bg-red-50"
                  : slotClosed
                    ? "border-[#f5c26b] bg-[#fff4e6]"
                    : "border-slate-950/10 bg-white";
                return (
                  <div key={id} className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 ${closedCardClass}`}>
                    <div className="min-w-0">
                      <div className="font-bold leading-5">{hour}:00-{hour + 1}:00</div>
                      {booking ? (
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          <div>{booking.userName}</div>
                          <div>{formatBookingInstrument(booking)}{booking.lessonFormat ? ` / ${formatLessonFormat(booking.lessonFormat)}` : ""}</div>
                          {booking.bookingType === "trial" && booking.userBirthDate ? <div>生年月日: {formatBirthDateWithAgeAndGrade(booking.userBirthDate)}</div> : null}
                          <div>{booking.userPhoneNumber}</div>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm leading-6 text-slate-500">{dayClosed ? "1日休業" : slotClosed ? "時間休業" : "予約なし"}</div>
                      )}
                    </div>
                    <button
                      className={`${booking ? dangerButton : subtleButton} shrink-0 min-h-10 px-4 py-1.5 text-xs`}
                      disabled={dayClosed && !booking}
                      onClick={() => booking ? confirm(booking.bookingType === "trial" ? "体験レッスン予約をキャンセルしますか？" : "予約をキャンセルしますか？ユーザーの残り回数は1回戻ります。") && call(`/api/admin/bookings/${booking.id}/`, { method: "DELETE" }) : slotClosed ? call(`/api/admin/closed-days/slot/${id}/`, { method: "DELETE" }) : call("/api/admin/closed-days/slot/", { method: "POST", body: JSON.stringify({ date: selectedDate, hour }) })}
                    >
                      {booking ? "予約取消" : slotClosed ? "解除" : "休業"}
                    </button>
                  </div>
                );
              })}</div>
            </>
          ) : <><h2 className="text-xl font-black text-slate-950">日付を選択</h2><p className="mt-3 text-slate-600">カレンダーの日付をタップしてください。</p></>}
        </article>
      </div>
      <article className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">レッスン予約</h2><button className={subtleButton} onClick={() => void refreshLessonBookings()}>更新</button></div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={bookingTab === "new" ? selectedButton : subtleButton} onClick={() => setBookingTab("new")}>新着</button>
          <button className={bookingTab === "future" ? selectedButton : subtleButton} onClick={() => { setBookingTab("future"); if (!bookingData.future.loaded) void loadBookingPage("future"); }}>今後</button>
          <button className={bookingTab === "past" ? selectedButton : subtleButton} onClick={() => { setBookingTab("past"); if (!bookingData.past.loaded) void loadBookingPage("past"); }}>過去</button>
        </div>
        <div className="mt-4 space-y-3">{visibleBookings.length ? visibleBookings.map((booking) => <div key={booking.id} className="rounded-lg bg-[#f7fbfa] p-3"><div className="font-black">{booking.bookingType === "trial" ? "体験レッスン" : "通常レッスン"} / {booking.userName}</div><div className="text-sm text-slate-600">{formatDateJa(booking.date)} {booking.startAt.slice(11, 16)}-{booking.endAt.slice(11, 16)} / {formatBookingInstrument(booking)}{booking.lessonFormat ? ` / ${formatLessonFormat(booking.lessonFormat)}` : ""} / {booking.userPhoneNumber}{booking.bookingType === "trial" && booking.userBirthDate ? ` / 生年月日: ${formatBirthDateWithAgeAndGrade(booking.userBirthDate)}` : ""}</div></div>) : <p className="text-sm text-slate-500">予約情報はありません。</p>}</div>
        {hasMoreBookings ? <button className={`${subtleButton} mt-4 w-full`} onClick={() => void loadBookingPage(bookingTab, true)}>さらに表示</button> : null}
      </article>
    </div>
  );
}

function AdminApplications({ authUser, applications, refresh, setError, setNotice }: { authUser: User; applications: LessonApplication[]; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
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

function AdminMemberUsers({ authUser, users, refresh, setError, setNotice }: { authUser: User; users: LessonUser[]; refresh: () => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
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
