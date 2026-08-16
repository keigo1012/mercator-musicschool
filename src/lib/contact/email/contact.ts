import type { ContactEmailInput, ResendEmailPayload } from "./types";
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, sendResendEmail } from "./transport";
import { emailShell, escapeHtml, messageBox } from "./template";

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


export async function sendContactEmail(input: ContactEmailInput) {
  const [adminEmail, customerEmail] = await Promise.all([
    sendResendEmail(buildAdminEmail(input)),
    sendResendEmail(buildCustomerEmail(input)),
  ]);
  return { adminEmail, customerEmail };
}
