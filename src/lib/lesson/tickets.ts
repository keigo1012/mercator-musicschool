import { addMonthsTokyo, dateKey, isoDate, toTokyoParts } from "@/lib/lesson/dates";
import type { LessonTicket } from "@/lib/lesson/types";

const MONTHLY_LESSON_GRANT_DAY = 26;

export function todayTokyoDate(now = new Date()) {
  const current = toTokyoParts(now);
  return isoDate(current.year, current.month, current.day);
}

export function monthlyLessonGrantMonthKey(now = new Date()) {
  const current = toTokyoParts(now);
  const targetMonth = current.day >= MONTHLY_LESSON_GRANT_DAY ? addMonthsTokyo(current.year, current.month, 1, 1) : current;

  return `${targetMonth.year}-${String(targetMonth.month).padStart(2, "0")}`;
}

export function monthlyLessonGrantIssueDate(now = new Date()) {
  const [year, month] = monthlyLessonGrantMonthKey(now).split("-").map(Number);
  const issueMonth = addMonthsTokyo(year, month, 1, -1);
  return isoDate(issueMonth.year, issueMonth.month, MONTHLY_LESSON_GRANT_DAY);
}

export function lessonTicketExpiryForIssueDate(issuedOn: string) {
  const [year, month] = issuedOn.split("-").map(Number);
  const expiryMonth = addMonthsTokyo(year, month, 1, 5);
  const lastDay = new Date(Date.UTC(expiryMonth.year, expiryMonth.month, 0)).getUTCDate();
  return isoDate(expiryMonth.year, expiryMonth.month, lastDay);
}

export function makeLessonTicket(input: { count: number; issuedOn?: string; expiresOn?: string; source: LessonTicket["source"] }) {
  const issuedOn = input.issuedOn ?? todayTokyoDate();
  return {
    id: `${input.source}-${issuedOn.replaceAll("-", "")}-${crypto.randomUUID()}`,
    count: Math.max(0, Math.floor(input.count)),
    issuedOn,
    expiresOn: input.expiresOn ?? lessonTicketExpiryForIssueDate(issuedOn),
    source: input.source,
  } satisfies LessonTicket;
}

export function normalizeLessonTickets(input: {
  lessonTickets?: unknown;
  today?: string;
}) {
  const today = input.today ?? todayTokyoDate();
  const rawTickets = Array.isArray(input.lessonTickets) ? input.lessonTickets : [];
  const tickets = rawTickets
    .map((ticket) => {
      if (!ticket || typeof ticket !== "object") return null;
      const item = ticket as Partial<LessonTicket>;
      const count = Math.max(0, Math.floor(Number(item.count ?? 0)));
      if (!count || !item.expiresOn || item.expiresOn < today) return null;
      return {
        id: String(item.id ?? `ticket-${item.expiresOn}-${crypto.randomUUID()}`),
        count,
        issuedOn: item.issuedOn ?? today,
        expiresOn: item.expiresOn,
        source: item.source ?? "admin",
      } satisfies LessonTicket;
    })
    .filter((ticket): ticket is LessonTicket => Boolean(ticket))
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.issuedOn.localeCompare(b.issuedOn));

  return tickets;
}

export function countRemainingLessons(tickets: LessonTicket[]) {
  return tickets.reduce((total, ticket) => total + ticket.count, 0);
}

export function consumeOneLessonTicket(tickets: LessonTicket[]) {
  const next = tickets.map((ticket, index) => (index === 0 ? { ...ticket, count: ticket.count - 1 } : ticket)).filter((ticket) => ticket.count > 0);
  return {
    next,
    consumed: tickets[0] ?? null,
  };
}

export function restoreLessonTicket(tickets: LessonTicket[], ticket: LessonTicket | null, today = todayTokyoDate()) {
  if (!ticket || ticket.expiresOn < today) {
    return tickets;
  }

  const existing = tickets.find((item) => item.id === ticket.id);
  if (existing) {
    return tickets.map((item) => (item.id === ticket.id ? { ...item, count: item.count + 1 } : item));
  }

  return [...tickets, { ...ticket, count: 1 }].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.issuedOn.localeCompare(b.issuedOn));
}

export function expiryWarningTickets(tickets: LessonTicket[], now = new Date()) {
  const current = toTokyoParts(now);
  const limit = addMonthsTokyo(current.year, current.month, current.day, 1);
  const todayValue = Number(dateKey(current.year, current.month, current.day));
  const limitValue = Number(dateKey(limit.year, limit.month, limit.day));

  return tickets.filter((ticket) => {
    const expiryValue = Number(ticket.expiresOn.replaceAll("-", ""));
    return expiryValue >= todayValue && expiryValue <= limitValue;
  });
}
