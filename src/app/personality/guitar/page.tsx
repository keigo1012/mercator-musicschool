import type { Metadata } from "next";
import { PersonalityResultPage } from "@/features/personality/result-page";

export const metadata: Metadata = {
  title: "ギター",
  alternates: { canonical: "/personality/guitar/" },
  openGraph: {
    title: "ギター",
    description: "クリエイティブな努力家 一見派手な楽器だと思われるギターですが、実は忍耐力のある努力家なあなたに向いています。感受性が高く、クリエイティブ思考が得意です。ギターの種類は大きく分けて本体一つで音が鳴るアコースティックギター […]",
    url: "/personality/guitar/",
  },
};

export default function GuitarPage() {
  return <PersonalityResultPage type="guitar" />;
}
