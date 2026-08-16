import { getInstrumentLabel } from "@/lib/lesson/constants";
import { formatBirthDateWithAgeAndGrade, monthEndAfterMonths, toTokyoParts } from "@/lib/lesson/dates";
import type { LessonBooking, LessonUser } from "@/lib/lesson/types";

export function todayIso() {
  const now = toTokyoParts();
  return `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
}

export function formatLessonMember(member: NonNullable<LessonUser["lessonMembers"]>[number], showGrade = false) {
  return `${member.name} (${showGrade ? formatBirthDateWithAgeAndGrade(member.birthDate) : member.birthDate})`;
}

export function defaultTicketExpiry() {
  return monthEndAfterMonths(6);
}


export function formatTicketSource(source: string) {
  if (source === "monthly") return "月次付与";
  return "管理者発行";
}


export function formatBookingInstrument(booking: Pick<LessonBooking, "bookingType" | "instrument">) {
  const label = getInstrumentLabel(booking.instrument);
  return booking.bookingType === "trial" ? `体験レッスン：${label}` : label;
}


export function lessonUserSearchText(user: LessonUser) {
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


export function lessonUserMemberTotal(users: LessonUser[]) {
  return users.reduce((total, user) => total + Math.max(1, Number(user.lessonMemberCount ?? user.lessonMembers?.length ?? 1)), 0);
}


export function lessonUserSortName(user: LessonUser) {
  return user.lessonFullName ?? "";
}


export function bookingCreatedAtValue(booking: LessonBooking) {
  return booking.createdAt || booking.startAt;
}
