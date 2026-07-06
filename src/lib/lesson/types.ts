export type LessonApplicationStatus = "none" | "pending" | "approved" | "rejected";
export type LessonApplicationReviewStatus = "pending" | "approved" | "rejected";

export type BookedLesson = {
  id: string;
  userId: string;
  memberName?: string;
  instrument: string;
  lessonFormat?: "inPerson" | "online";
  date: string;
  startAt: string;
  endAt: string;
  lessonTicketId?: string;
  lessonTicketIssuedOn?: string;
  lessonTicketExpiresOn?: string;
  lessonTicketSource?: LessonTicket["source"];
  googleCalendarEventId?: string;
  createdAt?: string;
};

export type LessonTicket = {
  id: string;
  count: number;
  issuedOn: string;
  expiresOn: string;
  source: "monthly" | "admin";
};

export type LessonUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  isAdmin: boolean;
  isBlockedByAdmin: boolean;
  hasLessonPlan: boolean;
  lessonApplicationStatus: LessonApplicationStatus;
  remainingLessons: number;
  monthlyLessonGrantCount: number;
  lastMonthlyLessonGrantMonth?: string;
  lessonTickets: LessonTicket[];
  selectedLessonInstrument: string;
  lessonMemberCount?: number;
  lessonMembers?: LessonMember[];
  bookedLessons: BookedLesson[];
  bookedLessonDates: string[];
  lessonFullName?: string;
  lessonBirthDate?: string;
  lessonPostalCode?: string;
  lessonAddress?: string;
  lessonPhoneNumber?: string;
  lessonEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LessonBooking = BookedLesson & {
  userName: string;
  userEmail: string;
  userPhoneNumber: string;
  userBirthDate?: string;
  lessonFormat?: "inPerson" | "online";
  bookingType?: "lesson" | "trial";
  updatedAt?: string;
};

export type LessonMember = {
  name: string;
  birthDate: string;
};

export type TrialBooking = {
  id: string;
  userName: string;
  userEmail: string;
  userPhoneNumber: string;
  userBirthDate: string;
  lessonFormat: "inPerson" | "online";
  instrument: string;
  bookingType?: "trial";
  date: string;
  hour: number;
  startAt: string;
  endAt: string;
  googleCalendarEventId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LessonClosedDay = {
  id: string;
  date: string;
  scope: "day" | "slot";
  hour?: number;
  note?: string;
  createdAt?: string;
  createdBy?: string;
};

export type LessonApplication = {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  memberCount: number;
  members: LessonMember[];
  postalCode: string;
  address: string;
  phoneNumber: string;
  email: string;
  status: LessonApplicationReviewStatus;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
};
