export const site = {
  name: "メルカトル音楽教室",
  phone: "09012718695",
  email: "contact@mercator-musicschool.com",
  reservationUrl: "https://airrsv.net/mercator-musicschool/calendar?schdlId=s000090CFE",
  youtubeFingerDrum: "https://www.youtube.com/",
  youtubePerformance: "https://www.youtube.com/",
  concertUrl: "https://brapla.com/",
};

export const navItems = [
  { label: "無料体験レッスンお申し込み", href: site.reservationUrl, external: true },
  { label: "レッスンスタジオ", href: "/studio/" },
  { label: "料金について", href: "/price/" },
  { label: "よくあるご質問", href: "/faq/" },
  { label: "楽器タイプ適正診断", href: "/personality/" },
  { label: "お問い合わせ", href: `mailto:${site.email}`, external: true },
];

export const footerItems = [
  ...navItems,
  { label: "プライバシーポリシー", href: "/privacypolicy/" },
];
