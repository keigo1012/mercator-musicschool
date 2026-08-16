import "server-only";

function requireServerEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} が未設定です。`);
  return value;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

export function getFirebaseAdminEnv() {
  return {
    clientEmail: requireServerEnv("FIREBASE_CLIENT_EMAIL", process.env.FIREBASE_CLIENT_EMAIL),
    privateKey: normalizePrivateKey(requireServerEnv("FIREBASE_PRIVATE_KEY", process.env.FIREBASE_PRIVATE_KEY)),
  };
}

export function getGoogleCalendarEnv() {
  return {
    clientEmail: requireServerEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL または FIREBASE_CLIENT_EMAIL", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL),
    privateKey: normalizePrivateKey(requireServerEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY または FIREBASE_PRIVATE_KEY", process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)),
    calendarId: requireServerEnv("GOOGLE_CALENDAR_ID", process.env.GOOGLE_CALENDAR_ID),
  };
}

export function getResendEnv() {
  return {
    apiKey: requireServerEnv("RESEND_API_KEY", process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL || "contact@mercator-musicschool.com",
    fromName: process.env.RESEND_FROM_NAME || "メルカトル音楽教室",
  };
}
