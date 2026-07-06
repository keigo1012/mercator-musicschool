import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { ContactFormClient } from "@/features/contact/contact-form-client";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "メルカトル音楽教室へのお問い合わせはこちらからお送りください。",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "お問い合わせ",
    description: "メルカトル音楽教室へのお問い合わせはこちらからお送りください。",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="お問い合わせ" />
      <section className="bg-white px-4 py-14 md:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-6">
            <h2 className="ui-heading font-black text-slate-950">お問い合わせフォーム</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">ご不明な点や、ご相談はこちらからお送りください。</p>
            <div className="mt-6">
              <ContactFormClient />
            </div>
          </article>
          <aside className="h-fit rounded-xl border border-slate-950/18 bg-[#f7fbfa] p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)] md:p-6">
            <h2 className="ui-heading font-black text-slate-950">ご連絡について</h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">お問い合わせ内容を確認後、担当者よりメールまたはお電話でご連絡します。</p>
            <div className="mt-5 rounded-lg bg-white px-4 py-3 text-sm font-bold text-slate-700">
              体験レッスンの日時予約は専用ページからお申し込みください。
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
