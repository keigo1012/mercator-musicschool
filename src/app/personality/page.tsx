import type { Metadata } from "next";
import Image from "next/image";
import { images } from "@/content/images";
import PersonalityClient from "@/features/personality/personality-client";

export const metadata: Metadata = {
  title: "楽器タイプ適正診断",
  description: "あなたにあった楽器を診断します。自分でも知らなかった意外な一面が見つかるかも？登録いらずで簡単な質問に答えるだけですぐに結果が出るので気軽にやってみてね！",
  alternates: { canonical: "/personality/" },
  openGraph: {
    title: "楽器タイプ診断",
    description: "あなたにあった楽器を診断します",
    url: "/personality/",
    images: [images.personality.shareOg],
  },
};

export default function PersonalityPage() {
  return (
    <>
      <section className="px-4 pt-8 pb-16 md:pt-10 md:pb-18">
        <div className="mx-auto max-w-5xl">
          <Image src={images.personality.testPc} alt="" width={1024} height={576} className="hidden w-full rounded-xl border border-slate-950/18 object-cover shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:block" priority />
          <Image src={images.personality.testMb} alt="" width={1024} height={768} className="w-full rounded-xl border border-slate-950/18 object-cover shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:hidden" priority />
          <div className="mt-10">
            <PersonalityClient />
          </div>
        </div>
      </section>
    </>
  );
}
