export function updateArrayWithoutBooking(bookedLessons: unknown, bookingId: string) {
  return Array.isArray(bookedLessons) ? bookedLessons.filter((item) => typeof item === "object" && item && (item as { id?: string }).id !== bookingId) : [];
}
