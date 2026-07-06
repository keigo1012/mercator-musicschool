"use client";

import { useCallback, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";

const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-slate-950/18 bg-white px-3 py-2 text-sm outline-none focus:border-[#0176BA] focus:ring-2 focus:ring-[#0176BA]/15";
const primaryButton = "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#0176BA] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#015F96] disabled:cursor-not-allowed disabled:bg-slate-300";

export function ContactFormClient() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileIdempotencyKey, setTurnstileIdempotencyKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileIdempotencyKey(crypto.randomUUID());
    setError("");
  }, []);

  const clearTurnstile = useCallback(() => {
    setTurnstileToken("");
    setTurnstileIdempotencyKey("");
  }, []);

  const handleTurnstileError = useCallback(() => {
    clearTurnstile();
    setError("セキュリティ認証を読み込めませんでした。ページを再読み込みしてください。解消しない場合は、Turnstileの許可ドメイン設定を確認してください。");
  }, [clearTurnstile]);

  function resetTurnstile() {
    clearTurnstile();
    setTurnstileResetKey((key) => key + 1);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!turnstileToken || !turnstileIdempotencyKey) {
      setError("セキュリティ認証を完了してください。");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken, turnstileIdempotencyKey }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "送信に失敗しました。");
      }
      setNotice("お問い合わせを送信しました。確認後、担当者よりご連絡いたします。");
      setForm({ name: "", email: "", phone: "", message: "" });
      resetTurnstile();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "送信に失敗しました。");
      resetTurnstile();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-bold text-slate-700">
          氏名
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={80} />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          メールアドレス
          <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={120} />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          電話番号
          <input className={inputClass} type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={40} />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          お問い合わせ内容
          <textarea className={`${inputClass} min-h-44 resize-y leading-7`} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required maxLength={2000} />
        </label>
        <TurnstileWidget resetKey={turnstileResetKey} onSuccess={handleTurnstileSuccess} onExpired={clearTurnstile} onError={handleTurnstileError} />
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}
        {notice ? <p className="rounded-lg bg-[#EAF6FD] px-3 py-2 text-sm font-bold text-[#015F96]">{notice}</p> : null}
        <button className={primaryButton} disabled={busy || !turnstileToken}>{busy ? "送信中" : "送信する"}</button>
      </form>
    </>
  );
}
