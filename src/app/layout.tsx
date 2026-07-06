import type { Metadata } from "next";
import { Header } from "@/components/site-header";
import { Footer } from "@/components/site-components";
import { PageChrome } from "@/components/site-page-chrome";
import { GoogleAnalytics } from "@/components/google-analytics";
import { jsonLdScript, localBusinessJsonLd } from "@/lib/seo/structured-data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mercator-musicschool.com"),
  title: {
    default: "土浦市の音楽教室ならメルカトル音楽教室｜初心者向け個人レッスン",
    template: "%s | 土浦市の音楽教室 メルカトル音楽教室",
  },
  description: "茨城県土浦市永国の音楽教室。ドラム、ポップスピアノ、ギター、ベース、フィンガードラム、DTMを初心者から個人レッスンで学べます。無料体験レッスン受付中。",
  keywords: ["土浦 音楽教室", "土浦市 音楽教室", "つくば 音楽教室", "ドラム教室 土浦", "ピアノ教室 土浦", "ギター教室 土浦", "メルカトル音楽教室"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "土浦市の音楽教室ならメルカトル音楽教室",
    description: "茨城県土浦市永国の音楽教室。初心者向けの個人レッスンと無料体験レッスンをご案内します。",
    url: "/",
    siteName: "メルカトル音楽教室",
    locale: "ja_JP",
    type: "website",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(localBusinessJsonLd),
          }}
        />
        <Header />
        <main>{children}</main>
        <PageChrome />
        <Footer />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
