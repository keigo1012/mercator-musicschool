import type { Metadata } from "next";
import { PersonalityResultPage } from "@/features/personality/result-page";

export const metadata: Metadata = {
  title: "ドラム",
  alternates: { canonical: "/personality/drum" },
  openGraph: {
    title: "ドラム",
    description: "責任感あるバンドの指揮者 人との関わりを大切にして、責任感のあるあなた。すぐに感情的になったりはしない。新しいことを生み出すクリエイティブな事は少し苦手。単体では一番音が大きな楽器なので、生の音を聞いたら一瞬で虜になって […]",
    url: "/personality/drum",
  },
};

export default function DrumPage() {
  return <PersonalityResultPage type="drum" />;
}
