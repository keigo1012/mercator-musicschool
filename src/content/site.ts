export const site = {
  name: "メルカトル音楽教室",
  phone: "09012718695",
  email: "contact@mercator-musicschool.com",
  contactHref: "/contact",
  reservationUrl: "/trial",
  youtubeFingerDrum: "https://www.youtube.com/",
  youtubePerformance: "https://www.youtube.com/",
  concertUrl: "https://brapla.com/",
};

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const myPageItem: NavItem = { label: "マイページ", href: "/mypage" };

export const navItems: NavItem[] = [
  { label: "無料体験レッスンお申し込み", href: site.reservationUrl },
  { label: "レッスンスタジオ", href: "/studio" },
  { label: "料金について", href: "/price" },
  { label: "よくあるご質問", href: "/faq" },
  { label: "楽器タイプ適正診断", href: "/personality" },
  { label: "お問い合わせ", href: site.contactHref },
];

export const mobileNavItems: NavItem[] = [
  ...navItems,
  myPageItem,
];

export const footerItems: NavItem[] = [
  ...navItems,
  { label: "プライバシーポリシー", href: "/privacypolicy" },
  myPageItem,
];
