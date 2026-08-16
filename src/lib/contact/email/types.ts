export type ContactEmailInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type TrialBookingEmailInput = {
  userName: string;
  userEmail: string;
  userPhoneNumber: string;
  userBirthDate: string;
  userBirthDateLabel: string;
  lessonFormatLabel: string;
  instrumentLabel: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
};

export type LessonApplicationAdminEmailInput = {
  fullName: string;
  birthDate: string;
  memberCount: number;
  members: Array<{ name: string; birthDate: string }>;
  postalCode: string;
  address: string;
  phoneNumber: string;
  email: string;
};

export type ResendEmailPayload = {
  to: string[];
  reply_to?: string;
  subject: string;
  text: string;
  html: string;
  tags: { name: string; value: string }[];
};
