import Image from "next/image";
import { ResultCommonSections } from "@/components/site-components";
import { images } from "@/content/images";
import { resultPages } from "@/content/personality";

export function PersonalityResultPage({ type }: { type: keyof typeof resultPages }) {
  const result = resultPages[type];
  const shareUrl = `http://twitter.com/share?text=${encodeURIComponent(`${result.share}\nあなたはどの楽器だった？\n\n【楽器タイプ適正診断】\n`)}&url=https://www.mercator-musicschool.com/personality`;

  return (
    <>
      <section className="px-4 py-14 md:py-18">
        <div className="mx-auto max-w-5xl">
          <Image src={result.imagePc} alt="" width={1024} height={576} className="hidden w-full rounded-xl border border-slate-950/18 object-cover shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:block" loading="eager" />
          <Image src={result.imageMb} alt="" width={1024} height={768} className="w-full rounded-xl border border-slate-950/18 object-cover shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:hidden" loading="eager" />
          <article className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-10">
            <h1 className={`content-heading luxury-heading card-heading personality-result-heading personality-result-heading-${type}`}>{result.catch}</h1>
            <p className="personality-result-body mt-6 text-left text-slate-700">{result.body}</p>
          </article>
          <p className="mt-10 text-center text-lg font-bold text-slate-950">結果をシェアする</p>
          <div className="mt-5 flex justify-center gap-5">
            <a href={shareUrl} target="_blank" rel="noreferrer">
              <Image src={images.personality.x} alt="" width={64} height={64} className="personality-share-icon h-16 w-16" />
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=https://www.mercator-musicschool.com/personality" target="_blank" rel="noreferrer">
              <Image src={images.personality.facebook} alt="" width={64} height={64} className="personality-share-icon h-16 w-16" />
            </a>
            <a href="https://social-plugins.line.me/lineit/share?url=https://www.mercator-musicschool.com/personality" target="_blank" rel="noreferrer">
              <Image src={images.personality.line} alt="" width={64} height={64} className="personality-share-icon h-16 w-16" />
            </a>
          </div>
        </div>
      </section>
      <ResultCommonSections />
    </>
  );
}
