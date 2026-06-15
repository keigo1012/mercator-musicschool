import type { Metadata } from "next";
import { PersonalityResultPage } from "@/features/personality/result-page";

export const metadata: Metadata = {
  title: "ピアノ",
  alternates: { canonical: "/personality/piano/" },
  openGraph: {
    title: "ピアノ",
    description: "こだわりの強い本格派シェフ 理性的でマイペース、こだわりの強さから前に出たがりだと思われがちだけど意外とシャイなあなた。真面目で知的な人も多く、音楽への向き合い方はまるで本格派シェフ。一人でも完結する楽器なので家で練習す […]",
    url: "/personality/piano/",
  },
};

export default function PianoPage() {
  return <PersonalityResultPage type="piano" />;
}
