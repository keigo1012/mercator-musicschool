const RESEND_API_URL = "https://api.resend.com/emails";
const CONTACT_TO_EMAIL = "mercator.musicschool@gmail.com";
const CONTACT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "contact@mercator-musicschool.com";
const CONTACT_FROM_NAME = process.env.RESEND_FROM_NAME || "メルカトル音楽教室";

type ContactEmailInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type TrialBookingEmailInput = {
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

type ResendErrorResponse = {
  message?: string;
  name?: string;
};

type ResendEmailPayload = {
  to: string[];
  reply_to?: string;
  subject: string;
  text: string;
  html: string;
  tags: { name: string; value: string }[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function emailShell({ title, intro, children }: { title: string; intro: string; children: string }) {
  return `<!doctype html>
<html lang="ja">
  <body style="margin:0;background:#f4f7fb;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#10243a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;overflow:hidden;border-radius:16px;background:#ffffff;border:1px solid #d9ecf8;">
            <tr>
              <td style="background:#0176ba;padding:22px 28px;color:#ffffff;">
                <div style="font-size:13px;font-weight:700;letter-spacing:.04em;">メルカトル音楽教室</div>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.45;font-weight:800;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 22px;font-size:15px;line-height:1.9;">${nl2br(intro)}</p>
                ${children}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5eef6;padding:18px 28px;color:#64748b;font-size:12px;line-height:1.7;">
                このメールはメルカトル音楽教室のWebサイトから自動送信されています。
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailTable(input: ContactEmailInput) {
  const rows = [
    ["氏名", input.name],
    ["メールアドレス", input.email],
    ["電話番号", input.phone || "未入力"],
  ];

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 24px;border:1px solid #dbeafe;border-radius:12px;overflow:hidden;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <th align="left" style="width:150px;background:#f1f8fe;border-bottom:1px solid #dbeafe;padding:13px 16px;font-size:13px;color:#475569;">${escapeHtml(label)}</th>
              <td style="border-bottom:1px solid #dbeafe;padding:13px 16px;font-size:14px;color:#10243a;">${escapeHtml(value)}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

function keyValueTable(rows: Array<[string, string]>) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 24px;border:1px solid #dbeafe;border-radius:12px;overflow:hidden;">
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <th align="left" style="width:150px;background:#f1f8fe;border-bottom:1px solid #dbeafe;padding:13px 16px;font-size:13px;color:#475569;">${escapeHtml(label)}</th>
              <td style="border-bottom:1px solid #dbeafe;padding:13px 16px;font-size:14px;color:#10243a;">${escapeHtml(value)}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

function messageBox(message: string) {
  return `
    <div style="margin-top:6px;">
      <div style="margin:0 0 8px;font-size:13px;font-weight:800;color:#475569;">お問い合わせ内容</div>
      <div style="white-space:normal;border:1px solid #dbeafe;border-radius:12px;background:#fbfdff;padding:16px;font-size:15px;line-height:1.9;color:#10243a;">
        ${nl2br(message)}
      </div>
    </div>
  `;
}

function trialBookingTable(input: TrialBookingEmailInput) {
  return keyValueTable([
    ["氏名", input.userName],
    ["生年月日", input.userBirthDateLabel],
    ["メールアドレス", input.userEmail],
    ["電話番号", input.userPhoneNumber],
    ["受講形式", input.lessonFormatLabel],
    ["希望楽器", input.instrumentLabel],
    ["予約日時", `${input.dateLabel} ${input.startTime}-${input.endTime}`],
  ]);
}

function buildAdminEmail(input: ContactEmailInput): ResendEmailPayload {
  return {
    to: [CONTACT_TO_EMAIL],
    reply_to: input.email,
    subject: `【メルカトル音楽教室】お問い合わせ：${input.name}`,
    text: [
      "メルカトル音楽教室サイトからお問い合わせが届きました。",
      "",
      `氏名: ${input.name}`,
      `メールアドレス: ${input.email}`,
      `電話番号: ${input.phone || "未入力"}`,
      "",
      "お問い合わせ内容:",
      input.message,
    ].join("\n"),
    html: emailShell({
      title: "お問い合わせが届きました",
      intro: "Webサイトのお問い合わせフォームから送信がありました。返信する場合は、このメールにそのまま返信できます。",
      children: `${detailTable(input)}${messageBox(input.message)}`,
    }),
    tags: [{ name: "source", value: "contact_form_admin" }],
  };
}

function buildCustomerEmail(input: ContactEmailInput): ResendEmailPayload {
  return {
    to: [input.email],
    reply_to: CONTACT_FROM_EMAIL,
    subject: "【メルカトル音楽教室】お問い合わせありがとうございます",
    text: [
      `${input.name} 様`,
      "",
      "メルカトル音楽教室へお問い合わせいただきありがとうございます。",
      "以下の内容でお問い合わせを受け付けました。",
      "確認後、担当者よりメールまたはお電話でご連絡いたします。",
      "",
      `氏名: ${input.name}`,
      `メールアドレス: ${input.email}`,
      `電話番号: ${input.phone || "未入力"}`,
      "",
      "お問い合わせ内容:",
      input.message,
      "",
      "メルカトル音楽教室",
    ].join("\n"),
    html: emailShell({
      title: "お問い合わせありがとうございます",
      intro: `${input.name} 様\n\nメルカトル音楽教室へお問い合わせいただきありがとうございます。以下の内容でお問い合わせを受け付けました。確認後、担当者よりメールまたはお電話でご連絡いたします。`,
      children: `${detailTable(input)}${messageBox(input.message)}`,
    }),
    tags: [{ name: "source", value: "contact_form_customer" }],
  };
}

function buildTrialAdminEmail(input: TrialBookingEmailInput): ResendEmailPayload {
  return {
    to: [CONTACT_TO_EMAIL],
    reply_to: input.userEmail,
    subject: `【メルカトル音楽教室】無料体験レッスン申込：${input.userName}`,
    text: [
      "無料体験レッスンのお申し込みが届きました。",
      "",
      `氏名: ${input.userName}`,
      `生年月日: ${input.userBirthDateLabel}`,
      `メールアドレス: ${input.userEmail}`,
      `電話番号: ${input.userPhoneNumber}`,
      `受講形式: ${input.lessonFormatLabel}`,
      `希望楽器: ${input.instrumentLabel}`,
      `予約日時: ${input.dateLabel} ${input.startTime}-${input.endTime}`,
    ].join("\n"),
    html: emailShell({
      title: "無料体験レッスンのお申し込みが届きました",
      intro: "Webサイトの無料体験レッスン予約フォームから送信がありました。返信する場合は、このメールにそのまま返信できます。",
      children: trialBookingTable(input),
    }),
    tags: [{ name: "source", value: "trial_booking_admin" }],
  };
}

function buildTrialCustomerEmail(input: TrialBookingEmailInput): ResendEmailPayload {
  return {
    to: [input.userEmail],
    reply_to: CONTACT_FROM_EMAIL,
    subject: "【メルカトル音楽教室】無料体験レッスンのお申し込みありがとうございます",
    text: [
      `${input.userName} 様`,
      "",
      "メルカトル音楽教室の無料体験レッスンにお申し込みいただきありがとうございます。",
      "以下の内容で予約を受け付けました。",
      "",
      `氏名: ${input.userName}`,
      `生年月日: ${input.userBirthDate}`,
      `メールアドレス: ${input.userEmail}`,
      `電話番号: ${input.userPhoneNumber}`,
      `受講形式: ${input.lessonFormatLabel}`,
      `希望楽器: ${input.instrumentLabel}`,
      `予約日時: ${input.dateLabel} ${input.startTime}-${input.endTime}`,
      "",
      "メルカトル音楽教室",
    ].join("\n"),
    html: emailShell({
      title: "無料体験レッスンのお申し込みありがとうございます",
      intro: `${input.userName} 様\n\nメルカトル音楽教室の無料体験レッスンにお申し込みいただきありがとうございます。以下の内容で予約を受け付けました。`,
      children: trialBookingTable(input),
    }),
    tags: [{ name: "source", value: "trial_booking_customer" }],
  };
}

async function sendResendEmail(apiKey: string, payload: ResendEmailPayload) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: `${CONTACT_FROM_NAME} <${CONTACT_FROM_EMAIL}>`,
      ...payload,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as ResendErrorResponse | null;
    throw new Error(data?.message || "メール送信に失敗しました。");
  }

  return response.json().catch(() => ({}));
}

export async function sendContactEmail(input: ContactEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が設定されていません。");
  }

  const [adminEmail, customerEmail] = await Promise.all([
    sendResendEmail(apiKey, buildAdminEmail(input)),
    sendResendEmail(apiKey, buildCustomerEmail(input)),
  ]);

  return { adminEmail, customerEmail };
}

export async function sendTrialBookingEmail(input: TrialBookingEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が設定されていません。");
  }

  const [adminEmail, customerEmail] = await Promise.all([
    sendResendEmail(apiKey, buildTrialAdminEmail(input)),
    sendResendEmail(apiKey, buildTrialCustomerEmail(input)),
  ]);

  return { adminEmail, customerEmail };
}
