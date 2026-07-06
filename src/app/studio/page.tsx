import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { images } from "@/content/images";
import { accessLines, addressLines } from "@/content/studio";

export const metadata: Metadata = {
  title: "土浦市永国のレッスンスタジオ",
  description: "茨城県土浦市永国の音楽教室スタジオ。土浦駅から車で6分、イオンモール土浦から車で3分。ドラム・ピアノ・ギター・ベース・DTMの個人レッスンを行います。",
  alternates: { canonical: "/studio" },
  openGraph: {
    title: "土浦市永国のレッスンスタジオ",
    description: "土浦駅から車で6分の音楽教室スタジオで、ドラム・ピアノ・ギター・ベース・DTMの個人レッスンを行います。",
    url: "/studio",
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
              <h2 className="content-heading luxury-heading">オンライン/通常レッスン</h2>
              <div className="content-copy mx-auto mt-6 max-w-3xl space-y-2 text-[#10243A]">
                <p>通常レッスンは以下のスタジオで行います。</p>
                <p>レッスンで使用する楽器はスタジオに揃えてありますので、手ぶらでも大丈夫です。</p>
                <p>オンラインレッスンは全国どこにいる方でもビデオ通話ソフトを利用してレッスンいたします。</p>
              </div>
            </article>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div>
                  <h2 className="content-subheading luxury-heading">メルカトル音楽教室</h2>
                  <div className="content-copy mt-5 space-y-2 text-[#10243A]">
                    {accessLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
                <div>
                  <h2 className="content-subheading luxury-heading">レッスンスタジオ所在地</h2>
                  <div className="content-copy mt-5 space-y-2 text-[#10243A]">
                    {addressLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:col-span-2">
                <div>
                  <h2 className="content-subheading luxury-heading">駐車場</h2>
                  <p className="content-copy mt-5 text-[#10243A]">建物前に1台無料駐車場あり</p>
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
