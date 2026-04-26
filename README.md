# AI Proposal Intelligence OS

海外AI情報を「読んで終わり」にせず、提案ネタ、PoC案、設計書の種、営業トーク、社内共有文、SNS投稿に変換するためのAI事業開発ナレッジ基盤です。

この初期版は無料運用を最優先にした、外部依存なしのNodeアプリです。APIキーなしでもMock Modeで動き、有料APIは `APP_MODE=paid` かつ `PAID_AI_ENABLED=true` の時だけ呼び出します。

## Quick Start

```bash
cp .env.example .env
npm run dev
```

ブラウザで `http://127.0.0.1:3305` を開きます。

CLIでMock実行する場合:

```bash
npm run run:mock
```

## Modes

- `APP_MODE=mock`: すべてMockデータとMock AIで動作
- `APP_MODE=free`: APIキーがあっても有料AIを呼ばず、無料ローカル解析を優先
- `APP_MODE=paid`: `PAID_AI_ENABLED=true` の場合だけ Gemini/OpenAI を使用

有料APIが失敗した場合や無料枠に当たった場合は、Mock fallbackまたはローカル解析に戻ります。

## Required Environment

`.env.example` に以下を用意しています。

```env
APP_MODE=mock
AI_PROVIDER=mock
PAID_AI_ENABLED=false

GEMINI_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini

MAX_ITEMS_PER_RUN=30
MAX_DESIGN_DOCS_PER_RUN=3
DEEP_ANALYSIS_FOR_S_RANK_ONLY=true

NOTION_API_KEY=
NOTION_DATABASE_ID=
SLACK_WEBHOOK_URL=
CRON_SECRET=
```

APIキーやWebhook URLは `.env` に入れ、コミットしないでください。

## API

- `GET /api/config`: 現在の安全な設定を返す
- `POST /api/run`: 情報収集から提案インテリジェンス生成まで実行

## Step 2 UI/UX

Mockで動く初期版を、毎日確認する「AI Opportunity Brief」として見やすくしました。

### Views

- `Today`: 今日の結論、重要アップデートTOP3、できるようになったこと、提案ネタ、設計書、次アクション
- `Timeline`: AIアップデートを日付順に確認
- `Ideas`: 提案ネタ、PoC案、営業トーク、提案先企業を確認
- `Design Docs`: Sランク中心のPoC設計書候補を確認
- `Sources`: Mock収集元と元情報を確認

### UX Notes

- Notion-likeな白基調、広めの余白、ブロック型整理
- LINE/Slackのように一目で共有しやすい短い見出し
- Linear風のシンプルな5メニュー構成
- `APP_MODE`、`AI_PROVIDER`、`PAID_AI_ENABLED`、今日の推定コストを常時表示
- Loading / Empty / Error / 無料枠超過メッセージを画面側で表示
- スマホではナビゲーションを横スクロール、カードを縦積み表示

## Current Scope

現時点では、Mock/無料ローカル解析、有料AIゲート、UI/API/CLI、Step2のMock画面品質改善までを実装しています。次の拡張候補はRSS、GitHub Trending、arXiv、Notion/Slack保存です。
