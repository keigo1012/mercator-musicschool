"use client";

import { useEffect, useRef, useState } from "react";

export function HomeScrollGuide() {
  const guideRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hero = guideRef.current?.closest(".home-hero-media");

    if (!hero) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });

    observer.observe(hero);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <a ref={guideRef} href="#home-about" className={`home-scroll-guide ${isVisible ? "home-scroll-guide-visible" : ""}`} aria-label="メルカトル音楽教室とは？へスクロール">
      <span className="home-scroll-guide-label">SCROLL</span>
      <span className="home-scroll-guide-line" aria-hidden="true" />
    </a>
  );
}
