import type { Metadata } from "next";
import { LessonPortal } from "@/features/lesson/lesson-portal";

export const metadata: Metadata = {
  title: "レッスン",
  alternates: { canonical: "/lesson" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function LessonRoute() {
  return <LessonPortal mode="lesson" />;
}
