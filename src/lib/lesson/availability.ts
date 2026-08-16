import { isDefaultClosedLessonHour, LESSON_HOURS } from "./constants";
import { bookingIdFromDateHour, isoDate, toTokyoParts, validateLessonDeadline } from "./dates";

type IdLookup = Pick<ReadonlySet<string>, "has">;

export function isBookingDateUnavailable(date: string, bookedById: IdLookup, closedById: IdLookup) {
  if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) return true;
  return LESSON_HOURS.every((hour) => {
    const slotId = bookingIdFromDateHour(date, hour);
    return isDefaultClosedLessonHour(hour) || bookedById.has(slotId) || closedById.has(slotId);
  });
}

export function bookingDateStatus(date: string, bookedById: IdLookup, closedById: IdLookup) {
  if (validateLessonDeadline(date) || closedById.has(date.replaceAll("-", ""))) return "×";
  const selectableHours = LESSON_HOURS.filter((hour) => !isDefaultClosedLessonHour(hour));
  const availableCount = selectableHours.filter((hour) => {
    const slotId = bookingIdFromDateHour(date, hour);
    return !bookedById.has(slotId) && !closedById.has(slotId);
  }).length;
  if (availableCount === 0) return "×";
  if (availableCount === selectableHours.length) return "○";
  return "△";
}

export function findEarliestAvailableDate(bookedById: IdLookup, closedById: IdLookup) {
  const now = toTokyoParts();
  const max = new Date(Date.UTC(now.year, now.month - 1, now.day));
  max.setUTCMonth(max.getUTCMonth() + 2);

  for (let value = new Date(Date.UTC(now.year, now.month - 1, now.day + 1)); value <= max; value.setUTCDate(value.getUTCDate() + 1)) {
    const date = isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
    if (!isBookingDateUnavailable(date, bookedById, closedById)) return date;
  }
  return "";
}
