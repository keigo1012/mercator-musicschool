import type { MetadataRoute } from "next";

const baseUrl = "https://www.mercator-musicschool.com";
const lastModified = new Date("2026-06-24T00:00:00+09:00");

const pages = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/trial", changeFrequency: "weekly", priority: 0.95 },
  { path: "/studio", changeFrequency: "monthly", priority: 0.9 },
  { path: "/price", changeFrequency: "monthly", priority: 0.85 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/personality", changeFrequency: "monthly", priority: 0.65 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacypolicy", changeFrequency: "yearly", priority: 0.2 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
