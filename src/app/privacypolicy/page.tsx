import type { Metadata } from "next";
import { PageHeader } from "@/components/site-components";
import { policies } from "@/content/privacy";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  alternates: { canonical: "/privacypolicy/" },
  openGraph: {
    title: "プライバシーポリシー",
    description: "個人情報の取り扱いについて 1.個人情報の定義個人情報とは、個人に関する情報であり、お名前、生年月日、性別、電話番号、電子メールアドレス、職業、勤務先等、特定の個人を識別し得る情報をいいます。 2.個人情報の収集・利用当 […]",
    url: "/privacypolicy/",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader title="プライバシーポリシー" />
      <section className="px-4 py-18 md:py-20">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] md:p-10">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-wide text-slate-950">個人情報の取り扱いについて</h2>
          <div className="space-y-6 leading-8 text-slate-700">
            {policies.map((policy) => (
              <p key={policy}>
                {policy.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
