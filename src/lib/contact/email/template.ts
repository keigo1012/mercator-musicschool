export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function nl2br(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

export function emailShell({ title, intro, children }: { title: string; intro: string; children: string }) {
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
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function keyValueTable(rows: Array<[string, string]>) {
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

export function messageBox(message: string) {
  return `
    <div style="margin-top:6px;">
      <div style="margin:0 0 8px;font-size:13px;font-weight:800;color:#475569;">お問い合わせ内容</div>
      <div style="white-space:normal;border:1px solid #dbeafe;border-radius:12px;background:#fbfdff;padding:16px;font-size:15px;line-height:1.9;color:#10243a;">
        ${nl2br(message)}
      </div>
    </div>
  `;
}

export function trialStoreMessage() {
  return `
    <div style="margin-top:6px;">
      <div style="margin:0 0 8px;font-size:13px;font-weight:800;color:#475569;">店舗からのメッセージ</div>
      <div style="border:1px solid #dbeafe;border-radius:12px;background:#fbfdff;padding:16px;font-size:15px;line-height:1.9;color:#10243a;">
        新築の建物の為、車のナビでは表示されない場合がございます。<br>
        Googleマップにて検索してお越しくださいませ。<br><br>
        【メルカトル音楽教室 Googleマップ】<br>
        <a href="https://maps.app.goo.gl/S8f2TBwTgtoDViG29" style="color:#0176ba;word-break:break-all;">https://maps.app.goo.gl/S8f2TBwTgtoDViG29</a><br><br>
        ※前の生徒様がいらっしゃる場合がございますので、ご予約時間ちょうどになりましたら建物前のチャイムを鳴らして頂けると幸いです。<br><br>
        駐車場は建物前に1台、空いていなければ右側に砂利のスペース1台がございます。<br>
        場所が分からなければお気軽にお電話くださいませ。<br>
        Tel : 090-1271-8695<br><br>
        それでは当日お会いできるのを心よりお待ちしております。<br><br>
        メルカトル音楽教室
      </div>
    </div>
  `;
}
