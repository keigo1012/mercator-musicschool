"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ResultType = "guitar" | "piano" | "bass" | "drum";

type Choice = {
  label: string;
  goto: number;
};

type Question = {
  qnum: number;
  question: string;
  choices: Choice[];
};

const results: Record<number, ResultType> = {
  30: "guitar",
  31: "piano",
  32: "bass",
  33: "drum",
};

const questions: Record<number, Question> = {
  6: { qnum: 1, question: "初めて会う人と話すのは得意な方だ", choices: [{ label: "はい", goto: 16 }, { label: "いいえ", goto: 12 }] },
  7: { qnum: 5, question: "旅行に行くならしっかり計画を立てる", choices: [{ label: "はい", goto: 21 }, { label: "いいえ", goto: 29 }] },
  8: { qnum: 7, question: "マラソン大会に出るなら戦法はどれにする？", choices: [{ label: "スタートした瞬間にトップにダッシュ", goto: 30 }, { label: "マイペースで人の事は気にしない", goto: 31 }, { label: "最後に一気に追い上げる", goto: 30 }] },
  9: { qnum: 5, question: "学級会をやるならどの役職を選ぶ？", choices: [{ label: "委員長", goto: 21 }, { label: "副委員長", goto: 28 }, { label: "書記", goto: 28 }, { label: "会計", goto: 21 }] },
  10: { qnum: 3, question: "パソコン・スマホ等の電子機器は得意な方だ", choices: [{ label: "はい", goto: 13 }, { label: "いいえ", goto: 14 }] },
  11: { qnum: 4, question: "ゲームで初めの武器・職業を選ぶなら？", choices: [{ label: "剣", goto: 9 }, { label: "弓", goto: 26 }, { label: "魔法", goto: 26 }, { label: "格闘(拳)", goto: 9 }] },
  12: { qnum: 2, question: "スポーツのジャンルはどっちが得意？", choices: [{ label: "ラケットなど手に持つ道具を使う競技", goto: 34 }, { label: "バレーなど手に持つ道具を使わない競技", goto: 15 }] },
  13: { qnum: 4, question: "派手髪にしたことがある？orしてみたい？", choices: [{ label: "はい", goto: 27 }, { label: "いいえ", goto: 23 }] },
  14: { qnum: 4, question: "金銭的に余裕がある方ですか？", choices: [{ label: "はい", goto: 23 }, { label: "いいえ", goto: 26 }] },
  15: { qnum: 3, question: "男性声優はどっちの系統が好き？", choices: [{ label: "高くてよく通る声", goto: 14 }, { label: "低くてかっこいい声", goto: 11 }] },
  16: { qnum: 2, question: "YouTubeで見るジャンルはこの中なら？", choices: [{ label: "料理", goto: 10 }, { label: "エンタメ", goto: 15 }, { label: "ゲーム", goto: 15 }, { label: "美容・ファッション", goto: 10 }] },
  17: { qnum: 4, question: "好きなことなら他のことを忘れて没頭する", choices: [{ label: "はい", goto: 9 }, { label: "いいえ", goto: 7 }] },
  20: { qnum: 7, question: "デートに行くなら", choices: [{ label: "ロマンチックな場所へ", goto: 30 }, { label: "家でまったり", goto: 30 }, { label: "一緒にスポーツ", goto: 30 }, { label: "遊園地でアトラクションに乗る", goto: 30 }] },
  21: { qnum: 6, question: "授業中に挙手をするなら", choices: [{ label: "1番最初", goto: 24 }, { label: "2番目くらい", goto: 24 }, { label: "みんなが上げてから", goto: 38 }] },
  22: { qnum: 7, question: "友達と遊ぶより1人で遊ぶのが好き", choices: [{ label: "はい", goto: 31 }, { label: "いいえ", goto: 33 }] },
  23: { qnum: 5, question: "映画を見るならどこで", choices: [{ label: "家でまったり", goto: 36 }, { label: "基本は映画館へ", goto: 35 }] },
  24: { qnum: 7, question: "先輩と後輩ならどっちとの付き合いが上手？", choices: [{ label: "先輩付き合い", goto: 33 }, { label: "後輩付き合い", goto: 33 }] },
  25: { qnum: 6, question: "人前で目立つのが好き", choices: [{ label: "はい", goto: 20 }, { label: "いいえ", goto: 8 }] },
  26: { qnum: 5, question: "一対一で人と話すときは", choices: [{ label: "自分から話す事が多い", goto: 36 }, { label: "聞き役に回る事が多い", goto: 28 }] },
  27: { qnum: 5, question: "心が乱れている時に行く空間は？", choices: [{ label: "賑やかな場所", goto: 25 }, { label: "静かな場所", goto: 35 }] },
  28: { qnum: 6, question: "両親は厳しいほうだ", choices: [{ label: "はい", goto: 22 }, { label: "いいえ", goto: 24 }] },
  29: { qnum: 6, question: "人の喧嘩やトラブルを見るのは好きだ", choices: [{ label: "はい", goto: 38 }, { label: "いいえ", goto: 39 }] },
  34: { qnum: 3, question: "マラソン大会に出るなら戦法はどれにする？", choices: [{ label: "スタートした瞬間にトップにダッシュ", goto: 11 }, { label: "マイペースで人の事は気にしない", goto: 17 }, { label: "最後に一気に追い上げる", goto: 17 }] },
  35: { qnum: 6, question: "好きなことなら他のことを忘れて没頭する", choices: [{ label: "はい", goto: 8 }, { label: "いいえ", goto: 37 }] },
  36: { qnum: 6, question: "この中で得意だった教科は？", choices: [{ label: "体育", goto: 22 }, { label: "図工", goto: 37 }, { label: "家庭科", goto: 22 }] },
  37: { qnum: 7, question: "授業中挙手をするのは", choices: [{ label: "1番最初", goto: 31 }, { label: "2番目", goto: 31 }, { label: "みんなが上げてから", goto: 31 }] },
  38: { qnum: 7, question: "一対一で人と話すときは", choices: [{ label: "自分から話す事が多い", goto: 33 }, { label: "聞き役に回る事が多い", goto: 33 }] },
  39: { qnum: 7, question: "心が乱れている時に行く空間は？", choices: [{ label: "賑やかな場所", goto: 33 }, { label: "静かな場所", goto: 32 }] },
};

export default function PersonalityClient() {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(6);
  const [history, setHistory] = useState<number[]>([6]);
  const [transitioning, setTransitioning] = useState(false);
  const current = questions[currentId];

  function answer(nextId: number) {
    if (transitioning) return;
    setTransitioning(true);
    window.setTimeout(() => {
      const result = results[nextId];
      if (result) {
        router.push(`/personality/${result}/`);
        return;
      }

      setCurrentId(nextId);
      setHistory((prev) => [...prev, nextId]);
      setTransitioning(false);
    }, 180);
  }

  function goBack() {
    if (history.length <= 1) {
      return;
    }

    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setCurrentId(nextHistory[nextHistory.length - 1]);
  }

  return (
    <div className={`mx-auto max-w-xl rounded-xl border border-slate-950/18 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfd_100%)] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition duration-200 md:p-8 ${transitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}>
      <p className="personality-question-number font-black text-[#0176BA]">Q{current.qnum}</p>
      <p className="personality-question-copy mt-4 font-bold leading-8 text-slate-950">{current.question}</p>
      <div className="mt-8 grid gap-3">
        {current.choices.map((choice) => (
          <button key={`${currentId}-${choice.label}-${choice.goto}`} type="button" disabled={transitioning} onClick={() => answer(choice.goto)} className={`rounded-lg px-6 py-4 font-bold text-white shadow-[0_2px_4px_rgba(15,23,42,0.24)] transition hover:translate-y-1 hover:shadow-none disabled:cursor-wait disabled:opacity-75 ${choice.label === "はい" ? "bg-[#d32f2f] hover:bg-[#b71c1c]" : choice.label === "いいえ" ? "bg-[#0176BA] hover:bg-[#015F96]" : "bg-[#0176BA] hover:bg-[#56C1FF]"}`}>
            {choice.label}
          </button>
        ))}
        {history.length > 1 ? (
          <button type="button" onClick={goBack} className="rounded-lg bg-[#929292] px-6 py-4 font-bold text-white shadow-[0_2px_4px_rgba(15,23,42,0.24)] transition hover:translate-y-1 hover:bg-[#7a7a7a] hover:shadow-none">
            もどる
          </button>
        ) : null}
      </div>
    </div>
  );
}
