"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { images } from "@/content/images";
import { navItems } from "@/content/site";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d9ecf8] bg-white/92 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 justify-self-start sm:gap-3">
          <Image src={images.home.headerLogo} alt="メルカトル音楽教室" width={60} height={60} className="h-13 w-13 shrink-0 rounded-full sm:h-[60px] sm:w-[60px]" priority />
          <span className="min-w-0 whitespace-nowrap text-sm font-bold leading-tight tracking-[0.03em] text-slate-950 sm:text-base sm:tracking-[0.06em]">メルカトル音楽教室</span>
        </Link>
        <nav className="hidden min-w-0 items-center justify-center gap-0.5 justify-self-center text-xs font-semibold text-slate-700 lg:flex xl:text-sm">
          {navItems.map((item) =>
            item.external ? (
              <a key={item.label} href={item.href} className="whitespace-nowrap rounded-full px-1.5 py-2 hover:bg-[#EAF6FD] hover:text-slate-950 2xl:px-2" target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className="whitespace-nowrap rounded-full px-1.5 py-2 hover:bg-[#EAF6FD] hover:text-slate-950 2xl:px-2">
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div ref={menuRef} className="lg:hidden">
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-slate-950/18 bg-white text-slate-950 shadow-sm transition hover:bg-slate-50"
            aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={isOpen}
          >
            <span className="relative h-4 w-5">
              <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition ${isOpen ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>

          {isOpen ? (
            <div className="absolute inset-x-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
              <nav className="grid p-2 text-sm font-bold text-slate-800">
                {navItems.map((item) =>
                  item.external ? (
                    <a key={item.label} href={item.href} className="rounded-lg px-4 py-3 text-center hover:bg-[#EAF6FD] hover:text-slate-950" target="_blank" rel="noreferrer" onClick={() => setIsOpen(false)}>
                      {item.label}
                    </a>
                  ) : (
                    <Link key={item.label} href={item.href} className="rounded-lg px-4 py-3 text-center hover:bg-[#EAF6FD] hover:text-slate-950" onClick={() => setIsOpen(false)}>
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
