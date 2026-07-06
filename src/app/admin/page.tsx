import type { Metadata } from "next";
import { LessonPortal } from "@/features/lesson/lesson-portal";

export const metadata: Metadata = {
  title: "管理",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminRoute() {
  return <LessonPortal mode="admin" />;
}
