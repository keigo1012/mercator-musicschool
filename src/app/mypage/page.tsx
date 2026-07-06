import type { Metadata } from "next";
import { LessonPortal } from "@/features/lesson/lesson-portal";

export const metadata: Metadata = {
  title: "マイページ",
  alternates: { canonical: "/mypage" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function MyPageRoute() {
  return <LessonPortal mode="mypage" />;
}
