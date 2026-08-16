"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingCalendar } from "@/features/booking/booking-calendar";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { cardClass as card, inputClass, primaryButtonClass as primaryButton, selectedButtonClass as selectedButton, subtleButtonClass as subtleButton, unavailableSlotButtonClass as unavailableSlotButton } from "@/components/ui/styles";
import { DEFAULT_INSTRUMENT, getInstrumentLabel, INSTRUMENTS, isDefaultClosedLessonHour, LESSON_HOURS } from "@/lib/lesson/constants";
import { bookingDateStatus, findEarliestAvailableDate, isBookingDateUnavailable } from "@/lib/lesson/availability";
import { bookingIdFromDateHour, buildBirthDate, formatSlotJa, isoDate, toTokyoParts, validateLessonDeadline } from "@/lib/lesson/dates";

type ClosedDay = {
  id: string;
  date: string;
  scope: "day" | "slot";
};

type Availability = {
  bookedSlotIds: string[];
  closedDays: ClosedDay[];
};

const birthDateGrid = "mt-2 grid max-w-[15.5rem] grid-cols-[minmax(0,5.5rem)_minmax(0,4rem)_minmax(0,4rem)] gap-2";

function initialMonth() {
  const tomorrow = initialSelectedDate();
  return { year: Number(tomorrow.slice(0, 4)), month: Number(tomorrow.slice(5, 7)) };
}

function initialSelectedDate() {
  const now = toTokyoParts();
  const tomorrow = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
  return isoDate(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate());
}

export function TrialBookingClient() {
  const didAutoSelectInitialDate = useRef(false);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [lessonFormat, setLessonFormat] = useState<"inPerson" | "online">("inPerson");
  const [instrument, setInstrument] = useState(DEFAULT_INSTRUMENT);
  const [availability, setAvailability] = useState<Availability>({ bookedSlotIds: [], closedDays: [] });
  const [form, setForm] = useState({ userName: "", birthYear: "", birthMonth: "", birthDay: "", userPhoneNumber: "", userEmail: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileIdempotencyKey, setTurnstileIdempotencyKey] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const bookedSlotIds = useMemo(() => new Set(availability.bookedSlotIds), [availability.bookedSlotIds]);
  const closedById = useMemo(() => new Map(availability.closedDays.map((closed) => [closed.id, closed])), [availability.closedDays]);
  const isDateUnavailable = useCallback((date: string) => isBookingDateUnavailable(date, bookedSlotIds, closedById), [bookedSlotIds, closedById]);
  const getDateStatus = useCallback((date: string) => bookingDateStatus(date, bookedSlotIds, closedById), [bookedSlotIds, closedById]);

  async function refreshAvailability() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/trial-bookings/", { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as Availability & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "予約枠の取得に失敗しました。");
      }
      setAvailability(data as Availability);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約枠の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadAvailability() {
      try {
        const response = await fetch("/api/trial-bookings/", { cache: "no-store" });
        const data = await response.json().catch(() => ({})) as Availability & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "予約枠の取得に失敗しました。");
        }
        if (!ignore) {
          setAvailability(data as Availability);
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : "予約枠の取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadAvailability();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (loading || didAutoSelectInitialDate.current) return;
    const earliest = findEarliestAvailableDate(bookedSlotIds, closedById);
    didAutoSelectInitialDate.current = true;
    if (!earliest) return;
    if (selectedDate && !isDateUnavailable(selectedDate)) return;
    const timer = window.setTimeout(() => {
      setSelectedDate(earliest);
      setSelectedHour(null);
      setMonth({ year: Number(earliest.slice(0, 4)), month: Number(earliest.slice(5, 7)) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookedSlotIds, closedById, isDateUnavailable, loading, selectedDate]);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileIdempotencyKey(crypto.randomUUID());
    setError("");
  }, []);

  const clearTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileIdempotencyKey("");
  }, []);

  const handleTurnstileError = useCallback(() => {
    clearTurnstile();
    setError("セキュリティ認証を読み込めませんでした。ページを再読み込みしてください。解消しない場合は、Turnstileの許可ドメイン設定を確認してください。");
  }, [clearTurnstile]);

  function resetTurnstile() {
    clearTurnstile();
    setTurnstileResetKey((key) => key + 1);
  }

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(month.year, month.month - 1 + offset, 1));
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
    setSelectedDate("");
    setSelectedHour(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedDate || selectedHour === null) {
      setError("予約日時を選択してください。");
      return;
    }
    const userBirthDate = buildBirthDate(form.birthYear, form.birthMonth, form.birthDay);
    if (!userBirthDate) {
      setError("生年月日を正しく入力してください。");
      return;
    }
    if (!turnstileToken || !turnstileIdempotencyKey) {
      setError("セキュリティ認証を完了してください。");
      return;
    }
    if (!confirm(`無料体験レッスンを予約しますか？\n${formatSlotJa(selectedDate, selectedHour)}-${selectedHour + 1}:00\n受講形式：${lessonFormat === "online" ? "オンライン" : "対面"}\n楽器：${getInstrumentLabel(instrument)}`)) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/trial-bookings/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userName: form.userName,
          userPhoneNumber: form.userPhoneNumber,
          userEmail: form.userEmail,
          userBirthDate,
          lessonFormat,
          instrument,
          date: selectedDate,
          hour: selectedHour,
          turnstileToken,
          turnstileIdempotencyKey,
        }),
      });
      const data = await response.json().catch(() => ({})) as { emailWarning?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "予約に失敗しました。");
      }
      setNotice(data.emailWarning ?? "無料体験レッスンの予約が完了しました。");
      setSelectedDate(initialSelectedDate());
      setSelectedHour(null);
      setLessonFormat("inPerson");
      setForm({ userName: "", birthYear: "", birthMonth: "", birthDay: "", userPhoneNumber: "", userEmail: "" });
      resetTurnstile();
      await refreshAvailability();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約に失敗しました。");
      resetTurnstile();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="bg-white px-4 py-14 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <article className={card}><BookingCalendar month={month} selectedDate={selectedDate} onMoveMonth={moveMonth} onSelectDate={(date) => { setSelectedDate(date); setSelectedHour(null); }} isDateUnavailable={isDateUnavailable} getDateStatus={getDateStatus} buttonClassName={subtleButton} headingClassName="ui-subheading" loading={loading} /></article>

          {selectedDate ? (
            <article className={card}>
              <h2 className="ui-heading font-black text-slate-950">{Number(selectedDate.slice(5, 7))}月{Number(selectedDate.slice(8, 10))}日の予約枠</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {LESSON_HOURS.map((hour) => {
                  const slotId = bookingIdFromDateHour(selectedDate, hour);
                  const unavailable = isDefaultClosedLessonHour(hour) || bookedSlotIds.has(slotId) || closedById.has(selectedDate.replaceAll("-", "")) || closedById.has(slotId) || Boolean(validateLessonDeadline(selectedDate));
                  return (
                    <button
                      key={slotId}
                      disabled={unavailable}
                      onClick={() => setSelectedHour(hour)}
                      className={`${unavailable ? unavailableSlotButton : selectedHour === hour ? selectedButton : subtleButton} justify-between rounded-lg`}
                    >
                      <span>{hour}:00-{hour + 1}:00 {unavailable ? "予約不可" : "予約可"}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ) : null}
        </div>

        <article className={`${card} h-fit`}>
          <h2 className="ui-heading font-black text-slate-950">無料体験レッスンお申し込み</h2>
          <div className="mt-4 rounded-lg bg-[#f7fbfa] px-4 py-3 text-sm font-bold text-slate-700">
            {selectedDate && selectedHour !== null ? `${formatSlotJa(selectedDate, selectedHour)}-${selectedHour + 1}:00` : "予約日時を選択してください"}
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-700">受講形式</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={lessonFormat === "inPerson" ? selectedButton : subtleButton} onClick={() => setLessonFormat("inPerson")}>対面</button>
              <button type="button" className={lessonFormat === "online" ? selectedButton : subtleButton} onClick={() => setLessonFormat("online")}>オンライン</button>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-700">予約する楽器</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {INSTRUMENTS.map((item) => (
                <button key={item.id} type="button" className={instrument === item.id ? selectedButton : subtleButton} onClick={() => setInstrument(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
          {notice ? <p className="mt-4 rounded-lg bg-[#EAF6FD] px-3 py-2 text-sm font-bold text-[#015F96]">{notice}</p> : null}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-slate-700">氏名<input className={`${inputClass} mt-2`} value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} required /></label>
            <div>
              <p className="text-sm font-bold text-slate-700">生年月日</p>
              <div className={birthDateGrid}>
                <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">年</span><input className={inputClass} inputMode="numeric" placeholder="年" value={form.birthYear} onChange={(event) => setForm({ ...form, birthYear: event.target.value })} required /></label>
                <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">月</span><input className={inputClass} inputMode="numeric" placeholder="月" value={form.birthMonth} onChange={(event) => setForm({ ...form, birthMonth: event.target.value })} required /></label>
                <label className="block min-w-0 text-sm font-bold text-slate-700"><span className="sr-only">日</span><input className={inputClass} inputMode="numeric" placeholder="日" value={form.birthDay} onChange={(event) => setForm({ ...form, birthDay: event.target.value })} required /></label>
              </div>
            </div>
            <label className="block text-sm font-bold text-slate-700">電話番号<input className={`${inputClass} mt-2`} value={form.userPhoneNumber} onChange={(event) => setForm({ ...form, userPhoneNumber: event.target.value })} required /></label>
            <label className="block text-sm font-bold text-slate-700">メールアドレス<input className={`${inputClass} mt-2`} type="email" value={form.userEmail} onChange={(event) => setForm({ ...form, userEmail: event.target.value })} required /></label>
            <TurnstileWidget resetKey={turnstileResetKey} onSuccess={handleTurnstileSuccess} onExpired={clearTurnstile} onError={handleTurnstileError} />
            <button className={`${primaryButton} w-full`} disabled={busy || !selectedDate || selectedHour === null || !turnstileToken}>{busy ? "予約中" : "無料体験レッスンお申し込み"}</button>
          </form>
        </article>
      </div>
      </section>
    </>
  );
}
