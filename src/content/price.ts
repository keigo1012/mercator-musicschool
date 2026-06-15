export type Plan = {
  title: string;
  prices: { amount: string; suffix?: string }[];
  note: string;
  mark: string;
  description: string;
};

export const plans: Plan[] = [
  {
    title: "体験レッスン",
    prices: [{ amount: "完全無料" }],
    note: "体験レッスンは約60分です。",
    mark: "Trial",
    description: "まずは教室やレッスンの雰囲気を気軽にお試しください。",
  },
  {
    title: "入会金",
    prices: [{ amount: "13,000円" }],
    note: "事務手数料等を含みます。",
    mark: "Join",
    description: "ご入会時のみ必要な初期費用です。",
  },
  {
    title: "個人レッスン",
    prices: [
      { amount: "10,000円", suffix: "/ 月2回（60分レッスン）" },
      { amount: "15,000円", suffix: "/ 月3回（60分レッスン）" },
      { amount: "20,000円", suffix: "/ 月4回（60分レッスン）" },
    ],
    note: "月4回以上のプランもございますので、ご希望の際はお申し付けくださいませ。",
    mark: "Lesson",
    description: "全コース個人レッスン。毎回、受けたい楽器を自由に選べます。",
  },
];
