import type { Metadata } from "next";
import { PageHeader, SectionTitle } from "@/components/site-components";
import { faqSections } from "@/content/faq";
import { images } from "@/content/images";

export const metadata: Metadata = {
  title: "よくあるご質問",
  description: "Q.複数の楽器を習う事は可能ですか？A.メルカトル音楽教室では月の回数の中から毎回自由にコースを選んでいただく事ができます。",
  alternates: { canonical: "/faq/" },
  openGraph: {
    title: "よくあるご質問",
    description: "Q.複数の楽器を習う事は可能ですか？A.メルカトル音楽教室では月の回数の中から毎回自由にコースを選んでいただく事ができます。",
    url: "/faq/",
  },
};

export default function FaqPage() {
  return (
    <>
      <PageHeader title="よくあるご質問" imageSrc={images.faq.hero} imageAlt="よくあるご質問" />
      <section className="px-4 py-18 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-10">
            {faqSections.map((section) => (
              <section key={section.title}>
                <SectionTitle title={section.title} />
                <div className="space-y-4">
                  {section.items.map(([q, a]) => (
                    <details key={q} className="group overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_14px_35px_rgba(15,23,42,0.06)] [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 bg-[#0176BA] px-5 py-4 text-left font-bold text-white transition hover:bg-[#015F96]">
                        <span>{q}</span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/75 text-lg text-white transition group-open:rotate-45">＋</span>
                      </summary>
                      <div className="border-t border-slate-950/18 px-5 py-5">
                        <p className="leading-8 text-slate-700">{a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
