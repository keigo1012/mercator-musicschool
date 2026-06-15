import type { Metadata } from "next";
import { Header } from "@/components/site-header";
import { BottomExperienceImage, FixedBottomCta, Footer } from "@/components/site-components";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mercator-musicschool.com"),
  title: {
    default: "【つくば土浦】絶対に挫折させないレッスンはメルカトル音楽教室",
    template: "%s",
  },
  description: "楽器初心者を挫折させない事に自信を持った音楽教室。一人一人に合わせたオーダーメイドレッスンを一度体験してみませんか？",
  openGraph: {
    siteName: "メルカトル音楽教室",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-scroll-behavior="smooth">
      <body className="pb-22 sm:pb-24 lg:pb-0">
        <Header />
        <main>{children}</main>
        <BottomExperienceImage />
        <Footer />
        <FixedBottomCta />
      </body>
    </html>
  );
}
