import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Cards, CourseSection, Section, SystemSection } from "@/components/site-components";
import { homeFaqs, voices } from "@/content/home";
import { images } from "@/content/images";

export const metadata: Metadata = {
  title: "【つくば土浦】絶対に挫折させないレッスンはメルカトル音楽教室",
  description: "楽器初心者を挫折させない事に自信を持った音楽教室。一人一人に合わせたオーダーメイドレッスンを一度体験してみませんか？",
  alternates: { canonical: "https://www.mercator-musicschool.com/" },
  openGraph: {
    title: "メルカトル音楽教室",
    description: "絶対に挫折させないレッスンで定評のある楽器初心者から通える音楽教室です。",
    url: "https://www.mercator-musicschool.com/",
    images: [images.home.top],
  },
};

export default function Home() {
  return (
    <>
      <section className="overflow-hidden bg-white">
        <div className="w-full bg-white">
          <Image src={images.home.top} alt="" width={1536} height={1024} className="h-auto w-full object-contain" priority />
        </div>
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-8 text-center md:pt-18 md:pb-12">
          <h1 className="hero-catch home-hero-catch mx-auto max-w-4xl text-4xl md:text-6xl">
            <span className="hero-catch-line hero-catch-line-primary">絶対に挫折させない</span>
            <span className="hero-catch-line hero-catch-line-secondary">0からの音楽教室</span>
          </h1>
          <div className="home-about-card mx-auto mt-8 max-w-3xl rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-slate-900 shadow-[0_20px_55px_rgba(15,23,42,0.08)] md:p-8">
            <h2 className="luxury-heading no-heading-marker luxury-heading-rule mx-auto max-w-3xl text-xl md:text-3xl">メルカトル音楽教室とは？</h2>
            <div className="luxury-heading-accent mx-auto mt-4" />
            <p className="home-about-copy mt-5 leading-8">
              楽器初心者のレッスン実績数百名以上の講師による
              <br />
              あらゆる方向から挫折させない柔軟なカリキュラム。
              <br />
              <br />
              名前の由来であるメルカトル図法は方角が正しい地図。
              <br />
              受講者様がやりたい事を最優先に考え
              <br />
              どんな経緯の人でも挫折する事なく最短で導きます。
              <br />
              <br />
              機械的な授業ではなく、一人一人に合わせた
              <br />
              オーダーメイドレッスンを一度体験してみませんか？
            </p>
          </div>
        </div>
      </section>
      <CourseSection tone="soft" />
      <SystemSection tone="white" />
      <Section title="受講者の声" tone="soft">
        <Cards items={voices} compact />
      </Section>
      <Section title="よくあるご質問">
        <div className="mx-auto max-w-3xl space-y-4">
          {homeFaqs.map(([q, a]) => (
            <details key={q} className="group overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_14px_35px_rgba(15,23,42,0.06)] [&_summary::-webkit-details-marker]:hidden">
              <summary className="home-faq-summary flex cursor-pointer items-center justify-between gap-4 bg-[#0176BA] px-5 py-4 text-left font-bold text-white transition hover:bg-[#015F96]">
                <span className="home-faq-question">{q}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/75 text-lg text-white transition group-open:rotate-45">＋</span>
              </summary>
              <div className="border-t border-slate-950/18 px-5 py-5">
                <p className="home-faq-answer leading-8 text-slate-700">{a}</p>
              </div>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <ButtonLink href="/faq/">もっとみる</ButtonLink>
        </div>
      </Section>
    </>
  );
}
