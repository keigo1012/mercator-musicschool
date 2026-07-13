"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { DEFAULT_INSTRUMENT, getInstrumentLabel, INSTRUMENTS, isDefaultClosedLessonHour, LESSON_HOURS } from "@/lib/lesson/constants";
import { buildMonthDays, bookingIdFromDateHour, formatSlotJa, isoDate, isValidBirthDate, toTokyoParts, validateLessonDeadline } from "@/lib/lesson/dates";

type ClosedDay = {
  id: string;
  date: string;
  scope: "day" | "slot";
};

type Availability = {
  bookedSlotIds: string[];
  closedDays: ClosedDay[];
};

const card = "rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-full bg-[#0176BA] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#015F96] disabled:cursor-not-allowed disabled:bg-slate-300";
const subtleButton = "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-950/18 bg-white px-5 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400";
const selectedButton = "inline-flex min-h-11 items-center justify-center rounded-full border border-[#0176BA] bg-[#0176BA] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#015F96] disabled:cursor-not-allowed disabled:bg-slate-300";
const unavailableSlotButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-950/10 bg-slate-100 px-5 py-2 text-sm font-bold text-slate-400 disabled:cursor-not-allowed";
const inputClass = "min-h-11 w-full rounded-lg border border-slate-950/18 bg-white px-3 py-2 text-sm outline-none focus:border-[#0176BA] focus:ring-2 focus:ring-[#0176BA]/15";
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

function findEarliestAvailableDate(bookedSlotIds: Set<string>, closedById: Map<string, ClosedDay>) {
  const now = toTokyoParts();
  const max = new Date(Date.UTC(now.year, now.month - 1, now.day));
  max.setUTCMonth(max.getUTCMonth() + 2);

  for (let value = new Date(Date.UTC(now.year, now.month - 1, now.day + 1)); value <= max; value.setUTCDate(value.getUTCDate() + 1)) {
    const date = isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) continue;
    const hasAvailableHour = LESSON_HOURS.some((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return !isDefaultClosedLessonHour(hour) && !bookedSlotIds.has(slotId) && !closedById.has(slotId);
    });
    if (hasAvailableHour) return date;
  }

  return "";
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
  const cells = useMemo(() => buildMonthDays(month.year, month.month), [month]);
  const bookedSlotIds = useMemo(() => new Set(availability.bookedSlotIds), [availability.bookedSlotIds]);
  const closedById = useMemo(() => new Map(availability.closedDays.map((closed) => [closed.id, closed])), [availability.closedDays]);

  const isDateUnavailable = useCallback((date: string) => {
    if (validateLessonDeadline(date)) {
      return true;
    }
    if (closedById.has(date.replaceAll("-", ""))) {
      return true;
    }
    return LESSON_HOURS.every((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return isDefaultClosedLessonHour(hour) || bookedSlotIds.has(slotId) || closedById.has(slotId);
    });
  }, [bookedSlotIds, closedById]);

  const getDateStatus = useCallback((date: string) => {
    if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) {
      return "×";
    }
    const selectableHours = LESSON_HOURS.filter((hour) => !isDefaultClosedLessonHour(hour));
    const availableCount = selectableHours.filter((hour) => {
      const slotId = bookingIdFromDateHour(date, hour);
      return !bookedSlotIds.has(slotId) && !closedById.has(slotId);
    }).length;

    if (availableCount === 0) return "×";
    if (availableCount === selectableHours.length) return "○";
    return "△";
  }, [bookedSlotIds, closedById]);

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
          <article className={card}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button className={subtleButton} onClick={() => moveMonth(-1)}>前月</button>
              <h2 className="ui-subheading font-black text-slate-950">{month.year}年{month.month}月</h2>
              <button className={subtleButton} onClick={() => moveMonth(1)}>翌月</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">{["日", "月", "火", "水", "木", "金", "土"].map((day) => <div key={day} className="py-2">{day}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const disabled = !cell.date;
                const unavailable = cell.date ? isDateUnavailable(cell.date) : false;
                const status = cell.date ? getDateStatus(cell.date) : "";
                return (
                  <button
                    key={cell.key}
                    disabled={disabled}
                    onClick={() => {
                      if (!cell.date) return;
                      setSelectedDate(cell.date);
                      setSelectedHour(null);
                    }}
                    className={`min-h-14 rounded-lg border p-1 text-sm font-bold ${cell.date === selectedDate ? "border-[#0176BA] bg-[#EAF6FD]" : unavailable ? "border-slate-950/10 bg-slate-100 text-slate-400" : "border-slate-950/10 bg-white"} disabled:bg-slate-100 disabled:text-slate-300`}
                  >
                    {cell.day}<span className="mt-1 block text-xs leading-none">{status}</span>
                  </button>
                );
              })}
            </div>
            {loading ? <p className="mt-4 text-sm font-bold text-slate-500">予約枠を読み込み中です。</p> : null}
          </article>

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
