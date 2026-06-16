# メルカトル音楽教室サイト

Next.js 16 の App Router を使ったサイトです。アプリ本体は `src` 配下にまとめています。

## よく編集する場所

- `src/content/site.ts`: 教室名、電話番号、メール、予約URL、ナビゲーション
- `src/content/home.ts`: トップページのコース、教室システム、受講者の声、トップページFAQ
- `src/content/faq.ts`: よくあるご質問
- `src/content/price.ts`: 料金プラン
- `src/content/studio.ts`: スタジオ住所、アクセス文言
- `src/content/privacy.ts`: プライバシーポリシー
- `src/content/personality.ts`: 楽器タイプ診断の結果文

## 構成

```text
src/
  app/                  URLに対応するページ
  components/           全ページ共通の見た目パーツ
  content/              文章・料金・連絡先などの編集データ
  features/personality/ 楽器タイプ診断の専用部品
public/                 画像などの静的ファイル
```

## 開発

```bash
npm run dev
```

確認用URLは http://localhost:3000 です。

## 確認

```bash
npm run lint
npm run build
```

## Cloudflare Pages

Cloudflare Pages では静的サイトとしてデプロイします。OpenNext / Workers は使いません。

- Framework preset: `Next.js (Static HTML Export)`
- Build command: `npm run build:cloudflare`
- Build output directory: `out`
- Production branch: `main`

`npx opennextjs-cloudflare build` は使わないでください。このサイトはログインや予約機能のない静的HPなので、`next.config.ts` の `output: "export"` で `out/` にHTML/CSS/JSを書き出します。

手元から直接アップロードする場合は、Cloudflare にログインした状態で以下を実行します。

```bash
npm run pages:deploy
```
