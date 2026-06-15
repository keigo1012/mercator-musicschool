import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { images } from "@/content/images";

export const metadata: Metadata = {
  title: "料金について",
  description: "無料体験レッスン、入会金、月2回から月4回までの個人レッスン料金をご案内します。",
  alternates: { canonical: "/price/" },
  openGraph: {
    title: "料金について",
    description: "無料体験レッスン、入会金、月2回から月4回までの個人レッスン料金をご案内します。",
    url: "/price/",
  },
};

export default function PricePage() {
  return (
    <>
      <PageHeader title="料金について" imageSrc={images.price.hero} imageAlt="料金について" />
      <section className="bg-white px-4 py-16 md:py-18">
        <div className="mx-auto max-w-3xl space-y-6">
          <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-8">
            <h2 className="luxury-heading text-2xl">体験レッスン</h2>
            <div className="luxury-heading-accent mx-auto mt-4" />
            <p className="mt-6 text-3xl font-black tracking-wide text-slate-950">完全無料</p>
            <p className="mt-5 text-sm leading-7 text-slate-500">※体験レッスンは約60分です。</p>
          </article>

          <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-8">
            <h2 className="luxury-heading text-2xl">入会金</h2>
            <div className="luxury-heading-accent mx-auto mt-4" />
            <p className="mt-6 text-xl font-black tracking-wide text-slate-950">13,000円</p>
            <p className="mt-5 text-sm leading-7 text-slate-500">※事務手数料等を含みます。</p>
          </article>

          <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-8">
            <h2 className="luxury-heading text-2xl">オンライン/通常レッスン</h2>
            <div className="luxury-heading-accent mx-auto mt-4" />
            <div className="mt-6 grid gap-4">
              <div className="rounded-lg border border-slate-950/12 bg-[#f7fbfa] px-4 py-5">
                <p className="text-xl font-black tracking-wide text-slate-950">10,000円 / 月2回 (60分レッスン)</p>
              </div>
              <div className="rounded-lg border border-[#9BD7F7] bg-[#F3FAFF] px-4 py-5 shadow-[0_10px_25px_rgba(1,118,186,0.08)]">
                <p className="text-xl font-black tracking-wide text-slate-950">15,000円 / 月3回 (60分レッスン)</p>
                <p className="mt-2 text-sm font-bold text-[#0176BA]">(一番人気でおすすめ！)</p>
              </div>
              <div className="rounded-lg border border-slate-950/12 bg-[#f7fbfa] px-4 py-5">
                <p className="text-xl font-black tracking-wide text-slate-950">20,000円 / 月4回 (60分レッスン)</p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-slate-500">
              ※月4回以上のプランもございますので、
              <br />
              ご希望の際はお申し付けくださいませ。
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
