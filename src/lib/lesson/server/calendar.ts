import { createSign } from "node:crypto";
import { getGoogleCalendarEnv } from "@/config/server-env";
import { adminDb, serverTimestamp } from "@/lib/firebase/admin";

type CalendarPayload =
  | {
      action: "create";
      bookingId: string;
      userId: string;
      userName: string;
      userEmail: string;
      userPhoneNumber: string;
      instrument: string;
      instrumentLabel: string;
      startAt: string;
      endAt: string;
      date: string;
    }
  | {
      action: "delete";
      bookingId: string;
      googleCalendarEventId: string;
    };

let calendarAccessToken: { token: string; expiresAt: number } | null = null;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function getGoogleCalendarCredentials() {
  return getGoogleCalendarEnv();
}

async function getGoogleCalendarAccessToken() {
  if (calendarAccessToken && calendarAccessToken.expiresAt > Date.now() + 60_000) {
    return calendarAccessToken.token;
  }

  const { clientEmail, privateKey } = getGoogleCalendarCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(unsignedJwt).sign(privateKey);
  const assertion = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string; error_description?: string } | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || "Google Calendar APIの認証に失敗しました。");
  }

  calendarAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return calendarAccessToken.token;
}

async function googleCalendarFetch(path: string, init: RequestInit = {}) {
  const token = await getGoogleCalendarAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const error = data.error as { message?: string } | undefined;
    throw new Error(error?.message || "Google Calendar API連携に失敗しました。");
  }

  return data;
}

export async function syncGoogleCalendar(payload: CalendarPayload) {
  const { calendarId } = getGoogleCalendarCredentials();
  const encodedCalendarId = encodeURIComponent(calendarId);

  if (payload.action === "delete") {
    await googleCalendarFetch(`/calendars/${encodedCalendarId}/events/${encodeURIComponent(payload.googleCalendarEventId)}`, {
      method: "DELETE",
    });
    return { success: true };
  }

  const data = await googleCalendarFetch(`/calendars/${encodedCalendarId}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: payload.userName,
      location: payload.instrumentLabel,
      description: [
        `予約ID: ${payload.bookingId}`,
        `楽器: ${payload.instrumentLabel}`,
        `氏名: ${payload.userName}`,
        `メール: ${payload.userEmail}`,
        `電話番号: ${payload.userPhoneNumber}`,
      ].join("\n"),
      start: {
        dateTime: payload.startAt,
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: payload.endAt,
        timeZone: "Asia/Tokyo",
      },
      extendedProperties: {
        private: {
          bookingId: payload.bookingId,
          userId: payload.userId,
          instrument: payload.instrument,
        },
      },
    }),
  });

  return { success: true, googleCalendarEventId: String(data.id ?? "") };
}

export async function writeCalendarSyncLog(input: {
  bookingId: string;
  action: "create" | "delete";
  status: "success" | "failed";
  googleCalendarEventId?: string;
  errorMessage?: string;
}) {
  await adminDb.collection("lessonCalendarSyncLogs").add({
    ...input,
    createdAt: serverTimestamp(),
  });
}
