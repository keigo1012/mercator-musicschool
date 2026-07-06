import { LESSON_HOURS } from "./constants";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type LessonSlot = {
  bookingId: string;
  dayId: string;
  slotId: string;
  date: string;
  hour: number;
  startAt: string;
  endAt: string;
};

export function toTokyoParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function dateKey(year: number, month: number, day: number) {
  return `${year}${pad2(month)}${pad2(day)}`;
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function isValidIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() + 1 === month && value.getUTCDate() === day;
}

export function isValidBirthDate(date: string, now = new Date()) {
  if (!isValidIsoDate(date)) return false;

  const [year, month, day] = date.split("-").map(Number);
  if (year < 1900) return false;

  const current = toTokyoParts(now);
  return Number(dateKey(year, month, day)) <= Number(dateKey(current.year, current.month, current.day));
}

export function getJapaneseSchoolGrade(birthDate: string, now = new Date()) {
  if (!isValidBirthDate(birthDate, now)) return null;

  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const current = toTokyoParts(now);
  const academicYear = current.month >= 4 ? current.year : current.year - 1;
  const startsSchoolIn = birthYear + (birthMonth < 4 || (birthMonth === 4 && birthDay === 1) ? 6 : 7);
  const gradeIndex = academicYear - startsSchoolIn;

  if (gradeIndex >= 0 && gradeIndex <= 5) return `小学${gradeIndex + 1}年生`;
  if (gradeIndex >= 6 && gradeIndex <= 8) return `中学${gradeIndex - 5}年生`;
  if (gradeIndex >= 9 && gradeIndex <= 11) return `高校${gradeIndex - 8}年生`;
  if (gradeIndex >= 12 && gradeIndex <= 15) return `大学${gradeIndex - 11}年生`;
  return null;
}

export function bookingIdFromDateHour(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  return `${dateKey(year, month, day)}${pad2(hour)}`;
}

export function parseBookingRequest(date: string, hour: number): LessonSlot {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !LESSON_HOURS.includes(hour as (typeof LESSON_HOURS)[number])) {
    throw new Error("予約日時が正しくありません。");
  }

  const [year, month, day] = date.split("-").map(Number);
  const dayId = dateKey(year, month, day);
  const slotId = `${dayId}${pad2(hour)}`;

  return {
    bookingId: slotId,
    dayId,
    slotId,
    date,
    hour,
    startAt: `${date}T${pad2(hour)}:00:00+09:00`,
    endAt: `${date}T${pad2(hour + 1)}:00:00+09:00`,
  };
}

export function getTokyoDateValue(date: string) {
  return Number(date.replaceAll("-", ""));
}

export function addMonthsTokyo(year: number, month: number, day: number, months: number) {
  const value = new Date(Date.UTC(year, month - 1 + months, day));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

export function validateLessonDeadline(date: string, now = new Date()) {
  const [year, month, day] = date.split("-").map(Number);
  const current = toTokyoParts(now);
  const targetValue = getTokyoDateValue(date);
  const todayValue = Number(dateKey(current.year, current.month, current.day));
  const max = addMonthsTokyo(current.year, current.month, current.day, 2);
  const maxValue = Number(dateKey(max.year, max.month, max.day));

  if (targetValue <= todayValue) {
    return "当日および過去日は選択できません。";
  }
  if (targetValue > maxValue) {
    return "予約できるのは2カ月先までです。";
  }

  const previousDay = new Date(Date.UTC(year, month - 1, day - 1));
  const previousValue = Number(dateKey(previousDay.getUTCFullYear(), previousDay.getUTCMonth() + 1, previousDay.getUTCDate()));
  if (Number(dateKey(current.year, current.month, current.day)) > previousValue || (Number(dateKey(current.year, current.month, current.day)) === previousValue && current.hour >= 22)) {
    return "予約・キャンセルは前日の22:00までです。";
  }

  return null;
}

export function formatDateJa(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

export function formatSlotJa(date: string, hour: number) {
  return `${formatDateJa(date)}${hour}:00`;
}

export function buildMonthDays(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<{ key: string; date: string | null; day: number | null }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `blank-${index}`, date: null, day: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: isoDate(year, month, day), date: isoDate(year, month, day), day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, date: null, day: null });
  }

  return cells;
}
