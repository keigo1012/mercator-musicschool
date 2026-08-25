"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { buildMonthDays, bookingIdFromDateHour, formatBirthDateWithAgeAndGrade, formatDateJa, toTokyoParts } from "@/lib/lesson/dates";
import { LESSON_HOURS } from "@/lib/lesson/constants";
import type { LessonBooking, LessonClosedDay } from "@/lib/lesson/types";
import { apiFetch, card, dangerButton, formatLessonFormat, primaryButton, selectedButton, subtleButton } from "./lesson-shared";
import { bookingCreatedAtValue, formatBookingInstrument, todayIso } from "./admin-shared";

type AdminBookingTab = "new" | "future" | "past";

export function AdminLessonTab({ authUser, setError, setNotice }: { authUser: User; setError: (m: string) => void; setNotice: (m: string) => void }) {
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
  const selectedAssignedBookings = selectedDate
    ? calendarBookings.filter((booking) => booking.date === selectedDate && booking.lessonKind === "adminAssigned")
    : [];

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
            const isToday = cell.date === today;
            return <button key={cell.key} disabled={!cell.date} aria-current={isToday ? "date" : undefined} onClick={() => cell.date && setSelectedDate(cell.date)} className={`min-h-16 rounded-lg border p-1 text-sm font-bold ${selectedDate === cell.date ? "border-[#0176BA]/30 bg-[#EAF6FD]" : isToday ? "border-[#f5c26b] bg-[#fff4e6]" : "border-slate-950/10 bg-white"} disabled:bg-slate-100`}><span>{cell.day}</span><span className="mt-1 block text-xs leading-none">{cell.date ? hasBooking ? "●" : dayClosed ? "×" : slotClosed ? "△" : "○" : ""}</span></button>;
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
              {selectedAssignedBookings.length ? (
                <div className="mt-5 border-t border-slate-950/10 pt-4">
                  <h3 className="font-black text-slate-950">管理者付与レッスン</h3>
                  <div className="mt-3 space-y-2">
                    {selectedAssignedBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#0176BA]/20 bg-[#EAF6FD] p-3">
                        <div className="min-w-0 text-sm">
                          <div className="font-black text-[#015F96]">{booking.lessonTitle || "管理者付与レッスン"}</div>
                          <div className="mt-1 text-slate-600">{booking.startAt.slice(11, 16)}-{booking.endAt.slice(11, 16)} / {booking.userName}</div>
                        </div>
                        <button className={`${dangerButton} shrink-0 min-h-10 px-4 py-1.5 text-xs`} onClick={() => confirm("この予約を取り消しますか？ユーザーの残り回数は1回戻ります。") && call(`/api/admin/bookings/${booking.id}/`, { method: "DELETE" })}>予約取消</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
        <div className="mt-4 space-y-3">{visibleBookings.length ? visibleBookings.map((booking) => <div key={booking.id} className="rounded-lg bg-[#f7fbfa] p-3"><div className="font-black">{booking.bookingType === "trial" ? "体験レッスン" : booking.lessonKind === "adminAssigned" ? "管理者付与" : "通常レッスン"} / {booking.userName}</div><div className="text-sm text-slate-600">{formatDateJa(booking.date)} {booking.startAt.slice(11, 16)}-{booking.endAt.slice(11, 16)} / {formatBookingInstrument(booking)}{booking.lessonKind !== "adminAssigned" && booking.lessonFormat ? ` / ${formatLessonFormat(booking.lessonFormat)}` : ""} / {booking.userPhoneNumber}{booking.bookingType === "trial" && booking.userBirthDate ? ` / 生年月日: ${formatBirthDateWithAgeAndGrade(booking.userBirthDate)}` : ""}</div></div>) : <p className="text-sm text-slate-500">予約情報はありません。</p>}</div>
        {hasMoreBookings ? <button className={`${subtleButton} mt-4 w-full`} onClick={() => void loadBookingPage(bookingTab, true)}>さらに表示</button> : null}
      </article>
    </div>
  );
}
