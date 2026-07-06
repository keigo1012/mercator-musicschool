import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { images } from "@/content/images";
import { TrialBookingClient } from "@/features/trial/trial-booking-client";

export const metadata: Metadata = {
  title: "土浦市の無料体験レッスンお申し込み",
  description: "土浦市永国のメルカトル音楽教室の無料体験レッスン予約。ドラム、ポップスピアノ、ギター、ベース、フィンガードラム、DTMから選べます。",
  alternates: { canonical: "/trial" },
  openGraph: {
    title: "土浦市の無料体験レッスンお申し込み",
    description: "土浦市永国のメルカトル音楽教室の無料体験レッスン予約ページです。",
    url: "/trial",
  },
};

export default function TrialPage() {
  return (
    <>
      <PageHeader title="無料体験レッスンお申し込み" imageSrc={images.trial.hero} imageAlt="無料体験レッスン" />
      <TrialBookingClient />
    </>
  );
}
