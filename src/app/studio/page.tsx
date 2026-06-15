import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { images } from "@/content/images";
import { accessLines, addressLines } from "@/content/studio";

export const metadata: Metadata = {
  title: "レッスンスタジオ",
  description: "土浦市永国のスタジオにてドラム・ピアノ・ギター・ベース・DTMから自由にレッスンを選択可能です。",
  alternates: { canonical: "/studio/" },
  openGraph: {
    title: "レッスンスタジオ",
    description: "土浦市永国のスタジオにてドラム・ピアノ・ギター・ベース・DTMから自由にレッスンを選択可能です。",
    url: "/studio/",
  },
};

export default function StudioPage() {
  return (
    <>
      <PageHeader title="レッスンスタジオ" imageSrc={images.studio.hero} imageAlt="レッスンスタジオ" />
      <main className="bg-white">
        <section className="px-4 py-14 md:py-20">
          <div className="mx-auto max-w-6xl">
            <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-8">
              <h2 className="luxury-heading text-2xl">オンライン/通常レッスン</h2>
              <div className="mx-auto mt-6 max-w-3xl space-y-3 leading-8 text-slate-700">
                <p>通常レッスンは以下のスタジオで行います。</p>
                <p>レッスンで使用する楽器はスタジオに揃えてありますので、手ぶらでも大丈夫です。</p>
                <p>オンラインレッスンは全国どこにいる方でもビデオ通話ソフトを利用してレッスンいたします。</p>
              </div>
            </article>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div>
                  <h2 className="luxury-heading text-xl">メルカトル音楽教室</h2>
                  <div className="mt-5 space-y-2 leading-8 text-slate-700">
                    {accessLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div>
                  <h2 className="luxury-heading text-xl">レッスンスタジオ所在地</h2>
                  <div className="mt-5 space-y-2 leading-8 text-slate-700">
                    {addressLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:col-span-2">
                <div>
                  <h2 className="luxury-heading text-xl">駐車場</h2>
                  <p className="mt-5 leading-8 text-slate-700">建物前に1台無料駐車場あり</p>
                </div>
              </article>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
              <iframe
                src="https://www.google.com/maps?q=%E8%8C%A8%E5%9F%8E%E7%9C%8C%E5%9C%9F%E6%B5%A6%E5%B8%82%E6%B0%B8%E5%9B%BD875&output=embed"
                title="レッスンスタジオ所在地"
                className="h-80 w-full border-0 md:h-96"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
