import type { LessonApplicationAdminEmailInput, ResendEmailPayload } from "./types";
import { CONTACT_TO_EMAIL, sendResendEmail } from "./transport";
import { emailShell, keyValueTable } from "./template";

function lessonApplicationTable(input: LessonApplicationAdminEmailInput) {
  const memberRows: Array<[string, string]> = input.memberCount >= 2
    ? input.members.map((member, index) => [`受講者${index + 1}`, `${member.name}（${member.birthDate}）`])
    : [];

  return keyValueTable([
    ["申込者氏名", input.fullName],
    ["生年月日", input.birthDate],
    ["受講人数", `${input.memberCount}名`],
    ...memberRows,
    ["郵便番号", input.postalCode],
    ["住所", input.address],
    ["電話番号", input.phoneNumber],
    ["メールアドレス", input.email],
  ]);
}


function buildLessonApplicationAdminEmail(input: LessonApplicationAdminEmailInput): ResendEmailPayload {
  const memberLines = input.memberCount >= 2
    ? input.members.map((member, index) => `受講者${index + 1}: ${member.name}（${member.birthDate}）`)
    : [];

  return {
    to: [CONTACT_TO_EMAIL],
    reply_to: input.email,
    subject: `【メルカトル音楽教室】レッスン会員登録の承認依頼：${input.fullName}`,
    text: [
      "レッスン会員登録の承認依頼が届きました。",
      "",
      `申込者氏名: ${input.fullName}`,
      `生年月日: ${input.birthDate}`,
      `受講人数: ${input.memberCount}名`,
      ...memberLines,
      `郵便番号: ${input.postalCode}`,
      `住所: ${input.address}`,
      `電話番号: ${input.phoneNumber}`,
      `メールアドレス: ${input.email}`,
    ].join("\n"),
    html: emailShell({
      title: "レッスン会員登録の承認依頼が届きました",
      intro: "Webサイトの会員登録フォームから承認依頼が送信されました。管理画面で申込内容を確認してください。",
      children: lessonApplicationTable(input),
    }),
    tags: [{ name: "source", value: "lesson_application_admin" }],
  };
}


export async function sendLessonApplicationAdminEmail(input: LessonApplicationAdminEmailInput) {
  return sendResendEmail(buildLessonApplicationAdminEmail(input));
}
