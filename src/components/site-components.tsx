import Image from "next/image";
import Link from "next/link";
import { concert, courses, systems } from "@/content/home";
import { images } from "@/content/images";
import { footerItems, mobileNavItems, navItems, site } from "@/content/site";

type CardItem = {
  title: string;
  image: string;
  alt: string;
  body: string[];
  link?: string;
  linkHref?: string;
};

const buttonClassName =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#0176BA] bg-white px-6 py-3 text-sm font-bold tracking-wide text-[#0176BA] transition hover:bg-[#0176BA] hover:text-white";

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

export function ButtonLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const classes = `${buttonClassName} ${className}`;

  if (isExternalHref(href)) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        <span>{children}</span>
        <span aria-hidden="true">›</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      <span>{children}</span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d9ecf8] bg-white/92 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 justify-self-start sm:gap-3">
          <Image src={images.home.headerLogo} alt="メルカトル音楽教室" width={60} height={60} className="h-13 w-13 shrink-0 rounded-full sm:h-[60px] sm:w-[60px]" loading="eager" />
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
        <details className="group lg:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-slate-950/18 bg-white text-slate-950 shadow-sm transition hover:bg-slate-50" aria-label="メニューを開く">
            <span className="relative h-4 w-5">
              <span className="absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition group-open:top-1.5 group-open:rotate-45" />
              <span className="absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition group-open:opacity-0" />
              <span className="absolute left-0 top-3 h-0.5 w-5 rounded-full bg-current transition group-open:top-1.5 group-open:-rotate-45" />
            </span>
          </summary>
          <div className="absolute inset-x-4 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
            <nav className="grid p-2 text-sm font-bold text-slate-800">
              {mobileNavItems.map((item) =>
                item.external ? (
                  <a key={item.label} href={item.href} className="rounded-lg px-4 py-3 text-center hover:bg-[#EAF6FD] hover:text-slate-950" target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} href={item.href} className="rounded-lg px-4 py-3 text-center hover:bg-[#EAF6FD] hover:text-slate-950">
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#07111f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
          {footerItems.map((item) =>
            item.external ? (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-[#74C8F5]">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className="text-slate-300 hover:text-[#74C8F5]">
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <Link href="/" className="mx-auto mt-8 block max-w-xs">
          <Image src={images.home.footerLogo} alt="会社ロゴ" width={180} height={180} className="footer-logo mx-auto rounded-full bg-white p-3" />
        </Link>
        <p className="mt-8 text-center text-xs text-slate-400">Copyright © メルカトル音楽教室 All Rights Reserved.</p>
      </div>
    </footer>
  );
}

export function BottomExperienceImage() {
  return (
    <section className="bg-white lg:hidden">
      <Image src={images.home.experience4} alt="無料体験レッスン" width={2172} height={724} className="h-auto w-full object-contain" />
    </section>
  );
}

export function FixedBottomCta() {
  return (
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
  );
}

export function PageHeader({ title, imageSrc, imageAlt = "" }: { title: string; imageSrc?: string; imageAlt?: string }) {
  if (imageSrc) {
    return (
      <section className="relative flex min-h-[175px] items-center overflow-hidden border-b border-[#d9ecf8] px-4 py-10 text-white md:min-h-[230px] md:py-12">
        <Image src={imageSrc} alt={imageAlt} fill className="object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.28),rgba(7,17,31,0.58))]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <h1 className="page-heading luxury-heading-light luxury-heading-rule mx-auto max-w-4xl text-3xl md:text-5xl">{title}</h1>
          <div className="luxury-heading-accent mx-auto mt-5" />
          <ol className="mt-5 flex justify-center gap-2 text-sm text-white/82">
            <li>
              <Link href="/">トップページ</Link>
            </li>
            <li>/</li>
            <li>{title}</li>
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-[#d9ecf8] bg-[linear-gradient(135deg,#f3faff_0%,#ffffff_48%,#e5f4fd_100%)] px-4 py-16">
      <div className="absolute left-1/2 top-0 h-36 w-[34rem] -translate-x-1/2 rounded-b-full bg-[#0176BA]/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl text-center">
        <h1 className="page-heading luxury-heading luxury-heading-rule mx-auto max-w-4xl text-3xl md:text-5xl">{title}</h1>
        <div className="luxury-heading-accent mx-auto mt-5" />
        <ol className="mt-5 flex justify-center gap-2 text-sm text-slate-500">
          <li>
            <Link href="/">トップページ</Link>
          </li>
          <li>/</li>
          <li>{title}</li>
        </ol>
      </div>
    </section>
  );
}

export function SectionTitle({ title, align = "center" }: { title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mb-10 text-center" : "mb-6 text-center"}>
      <h2 className="luxury-heading luxury-heading-rule section-heading mx-auto max-w-3xl text-3xl md:text-5xl">
        {title}
      </h2>
      <div className="luxury-heading-accent mx-auto mt-4" />
    </div>
  );
}

export function Section({ title, children, tone = "white" }: { title: string; children: React.ReactNode; tone?: "white" | "soft" }) {
  return (
    <section className={tone === "soft" ? "bg-[#f7fbfa] px-4 py-16 md:py-18" : "bg-white px-4 py-16 md:py-18"}>
      <div className="mx-auto max-w-6xl">
        <SectionTitle title={title} />
        {children}
      </div>
    </section>
  );
}

export function Lines({ lines, className = "", markParentheses = false }: { lines: string[]; className?: string; markParentheses?: boolean }) {
  return (
    <p className={`leading-8 text-[#10243A] ${className}`}>
      {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="copy-line">
          {markParentheses ? renderMarkedLine(line) : line}
          <br />
        </span>
      ))}
    </p>
  );
}

function renderMarkedLine(line: string) {
  const parts = line.split(/(\([^()]+\))/g);

  return parts.map((part, index) => {
    const marked = part.match(/^\(([^()]+)\)$/);

    if (marked) {
      return (
        <strong key={`${part}-${index}`} className="rounded-sm bg-[#fff1a8] px-1 font-extrabold text-slate-950">
          {marked[1]}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function Cards({ items, compact = false }: { items: CardItem[]; compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-6 lg:grid-cols-2" : "grid gap-6 md:grid-cols-2"}>
      {items.map((item, index) => (
        <article key={`${item.title}-${index}`} className="overflow-hidden rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className={compact ? "voice-card-inner flex items-center gap-5 p-5 md:gap-6 md:p-6" : "content-card-inner p-5 md:p-6"}>
            <Image src={item.image} alt={item.alt} width={1000} height={750} className={compact ? "voice-card-image h-30 w-30 shrink-0 rounded-lg border border-slate-950/18 object-cover sm:h-34 sm:w-34" : "aspect-[2/1] w-full rounded-lg object-cover"} />
            <div className={compact ? "copy-container min-w-0 flex-1 text-left" : "copy-container mt-5 text-center"}>
              {compact ? null : <h3 className="luxury-heading card-heading text-center text-2xl">{item.title}</h3>}
              <Lines lines={item.body} className={compact ? "voice-card-copy mt-3 text-sm" : "course-card-copy mt-4"} markParentheses={compact} />
              {compact ? <p className="voice-card-title mt-3 text-right text-xs font-bold text-slate-500">{item.title}</p> : null}
              {item.link && item.linkHref ? (
                <div className="mt-5">
                  <ButtonLink href={item.linkHref}>{item.link}</ButtonLink>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CourseSection({ tone = "white" }: { tone?: "white" | "soft" }) {
  return (
    <Section title="毎回自由に選べるコース" tone={tone}>
      <p className="section-intro-copy mb-10 text-center leading-8 text-[#10243A]">
        メルカトル音楽教室では一つの楽器だけでなく
        <br />
        毎回自由な楽器を選択して受ける事ができます。
      </p>
      <Cards items={courses} />
    </Section>
  );
}

export function SystemSection({ includeConcert = true, tone = "soft" }: { includeConcert?: boolean; tone?: "white" | "soft" }) {
  const systemItems = includeConcert ? [...systems, concert] : systems;

  return (
    <Section title="教室のシステムについて" tone={tone}>
      <div className="space-y-6">
        {systemItems.map((system, index) => (
          <article key={system.title} className="content-card-inner grid gap-8 rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-5 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:grid-cols-2 md:items-center md:p-6">
            <Image src={system.image} alt={system.alt} width={1000} height={750} className={`aspect-[4/3] w-full rounded-lg object-cover ${index % 2 === 1 ? "md:order-2" : ""}`} />
            <div className={`copy-container ${index % 2 === 1 ? "md:order-1" : ""}`}>
              <h3 className="luxury-heading card-heading system-card-heading text-2xl">{system.title}</h3>
              <Lines lines={system.body} className="system-card-copy mt-4" />
              {system.link && system.linkHref ? (
                <div className="mt-6">
                  <ButtonLink href={system.linkHref}>{system.link}</ButtonLink>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function ResultCommonSections() {
  return (
    <>
      <section className="bg-white px-4 pt-10 pb-16 md:pt-12 md:pb-18">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="hero-catch result-school-catch mx-auto max-w-4xl text-3xl md:text-5xl">
              <span className="hero-catch-line hero-catch-line-primary">絶対に挫折させない</span>
              <span className="hero-catch-line hero-catch-line-secondary">0から楽器を始めるなら</span>
              <span className="hero-catch-line hero-catch-line-secondary">メルカトル音楽教室</span>
            </h2>
          </div>
          <Cards items={courses} />
        </div>
      </section>
      <SystemSection includeConcert={false} />
    </>
  );
}
