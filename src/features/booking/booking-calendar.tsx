"use client";

import { useMemo } from "react";
import { buildMonthDays } from "@/lib/lesson/dates";

type BookingCalendarProps = {
  month: { year: number; month: number };
  selectedDate: string;
  onMoveMonth: (offset: number) => void;
  onSelectDate: (date: string) => void;
  isDateUnavailable: (date: string) => boolean;
  getDateStatus: (date: string) => string;
  buttonClassName: string;
  headingClassName?: string;
  loading?: boolean;
};

export function BookingCalendar({ month, selectedDate, onMoveMonth, onSelectDate, isDateUnavailable, getDateStatus, buttonClassName, headingClassName = "text-lg", loading = false }: BookingCalendarProps) {
  const cells = useMemo(() => buildMonthDays(month.year, month.month), [month]);
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className={buttonClassName} onClick={() => onMoveMonth(-1)}>前月</button>
        <h2 className={`${headingClassName} font-black text-slate-950`}>{month.year}年{month.month}月</h2>
        <button className={buttonClassName} onClick={() => onMoveMonth(1)}>翌月</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-black text-slate-500">{["日", "月", "火", "水", "木", "金", "土"].map((day) => <div key={day} className="py-2">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const unavailable = cell.date ? isDateUnavailable(cell.date) : false;
          const status = cell.date ? getDateStatus(cell.date) : "";
          return (
            <button key={cell.key} disabled={!cell.date} onClick={() => cell.date && onSelectDate(cell.date)} className={`min-h-14 rounded-lg border p-1 text-sm font-bold ${cell.date === selectedDate ? "border-[#0176BA] bg-[#EAF6FD]" : unavailable ? "border-slate-950/10 bg-slate-100 text-slate-400" : "border-slate-950/10 bg-white"} disabled:bg-slate-100 disabled:text-slate-300`}>
              {cell.day}<span className="mt-1 block text-xs leading-none">{status}</span>
            </button>
          );
        })}
      </div>
      {loading ? <p className="mt-4 text-sm font-bold text-slate-500">予約枠を読み込み中です。</p> : null}
    </>
  );
}
