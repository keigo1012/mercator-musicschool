import type { Metadata } from "next";
import { PersonalityResultPage } from "@/features/personality/result-page";

export const metadata: Metadata = {
  title: "ベース",
  alternates: { canonical: "/personality/bass/" },
  openGraph: {
    title: "ベース",
    description: "低音を支える静かなイケメン 物静かで何を考えているか分かりずらいと言われがちなあなた。争いは望まない平和主義な一面も。表面には見えないけど実は人と変わったところや、人一倍熱いハートを持っていたりするのではないでしょうか。 […]",
    url: "/personality/bass/",
  },
};

export default function BassPage() {
  return <PersonalityResultPage type="bass" />;
}
