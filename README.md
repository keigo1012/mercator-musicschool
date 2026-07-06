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
  app/       URLに対応するページとAPI Route Handlers
  components/ 全ページ共通の見た目パーツ
  content/    文章・料金・連絡先などの編集データ
  features/   会員、予約、無料体験、楽器診断
  lib/        Firebase、予約、回数券などの共通処理
public/       画像などの静的ファイル
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
npm run preview
```

## Cloudflare Workers

OpenNext for Cloudflareを使用して、Next.jsのRoute Handlersを含むアプリをCloudflare Workersへデプロイします。

```bash
npm run deploy
```

本番環境では、`.env.example` に記載したサーバー用環境変数をCloudflareのSecretとして設定してください。秘密鍵を`wrangler.jsonc`やGit管理対象ファイルへ直接記載しないでください。
