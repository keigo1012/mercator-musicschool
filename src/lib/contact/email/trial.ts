import { formatBirthDateWithAgeAndGrade } from "@/lib/lesson/dates";
import type { ResendEmailPayload, TrialBookingEmailInput } from "./types";
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, sendResendEmail } from "./transport";
import { emailShell, keyValueTable, trialStoreMessage } from "./template";

function trialBookingTable(input: TrialBookingEmailInput, showAgeAndGrade = false) {
  return keyValueTable([
    ["氏名", input.userName],
    ["生年月日", showAgeAndGrade ? formatBirthDateWithAgeAndGrade(input.userBirthDate) : input.userBirthDateLabel],
    ["メールアドレス", input.userEmail],
    ["電話番号", input.userPhoneNumber],
    ["受講形式", input.lessonFormatLabel],
    ["希望楽器", input.instrumentLabel],
    ["予約日時", `${input.dateLabel} ${input.startTime}-${input.endTime}`],
  ]);
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
      `生年月日: ${formatBirthDateWithAgeAndGrade(input.userBirthDate)}`,
      `メールアドレス: ${input.userEmail}`,
      `電話番号: ${input.userPhoneNumber}`,
      `受講形式: ${input.lessonFormatLabel}`,
      `希望楽器: ${input.instrumentLabel}`,
      `予約日時: ${input.dateLabel} ${input.startTime}-${input.endTime}`,
    ].join("\n"),
    html: emailShell({
      title: "無料体験レッスンのお申し込みが届きました",
      intro: "Webサイトの無料体験レッスン予約フォームから送信がありました。返信する場合は、このメールにそのまま返信できます。",
      children: trialBookingTable(input, true),
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
      "店舗からのメッセージ",
      "新築の建物の為、車のナビでは表示されない場合がございます。",
      "Googleマップにて検索してお越しくださいませ。",
      "",
      "【メルカトル音楽教室 Googleマップ】",
      "https://maps.app.goo.gl/S8f2TBwTgtoDViG29",
      "",
      "※前の生徒様がいらっしゃる場合がございますので、ご予約時間ちょうどになりましたら建物前のチャイムを鳴らして頂けると幸いです。",
      "",
      "駐車場は建物前に1台、空いていなければ右側に砂利のスペース1台がございます。",
      "場所が分からなければお気軽にお電話くださいませ。",
      "Tel : 090-1271-8695",
      "",
      "それでは当日お会いできるのを心よりお待ちしております。",
      "",
      "メルカトル音楽教室",
    ].join("\n"),
    html: emailShell({
      title: "無料体験レッスンのお申し込みありがとうございます",
      intro: `${input.userName} 様\n\nメルカトル音楽教室の無料体験レッスンにお申し込みいただきありがとうございます。以下の内容で予約を受け付けました。`,
      children: `${trialBookingTable(input)}${trialStoreMessage()}`,
    }),
    tags: [{ name: "source", value: "trial_booking_customer" }],
  };
}


export async function sendTrialBookingEmail(input: TrialBookingEmailInput) {
  const [adminEmail, customerEmail] = await Promise.all([
    sendResendEmail(buildTrialAdminEmail(input)),
    sendResendEmail(buildTrialCustomerEmail(input)),
  ]);
  return { adminEmail, customerEmail };
}

export async function sendTrialBookingAdminEmail(input: TrialBookingEmailInput) {
  return sendResendEmail(buildTrialAdminEmail(input));
}
