"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { images } from "@/content/images";
import { site } from "@/content/site";

export function PageChrome() {
  const pathname = usePathname();
  const hideLessonReservationBanners =
    pathname === "/lesson" ||
    pathname.startsWith("/lesson/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/trial" ||
    pathname.startsWith("/trial/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/mypage" ||
    pathname.startsWith("/mypage/");

  if (hideLessonReservationBanners) {
    return null;
  }

  return (
    <>
      <section className="bg-white lg:hidden">
        <Image src={images.home.experience4} alt="無料体験レッスン" width={2172} height={724} className="h-auto w-full object-contain" />
      </section>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/45 bg-white/88 px-3 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.14)] backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:inset-x-auto lg:right-4 lg:top-1/2 lg:bottom-auto lg:w-18 lg:-translate-y-1/2 lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-5">
          <Link href={site.contactHref} className="fixed-cta fixed-cta-contact">
            <span className="fixed-cta-pill">お問合せ</span>
            <span>はこちら</span>
          </Link>
          <a href={`tel:${site.phone}`} className="fixed-cta fixed-cta-trial">
            <span className="fixed-cta-pill">無料体験</span>
            <span>レッスンはこちら</span>
          </a>
        </div>
      </div>
    </>
  );
}
