# AI Proposal Intelligence OS

海外AI情報を「読んで終わり」にせず、提案ネタ、PoC案、設計書の種、営業トーク、社内共有文、SNS投稿に変換するためのAI事業開発ナレッジ基盤です。

この初期版は無料運用を最優先にした、外部依存なしのNodeアプリです。APIキーなしでもMock Modeで動き、有料APIは `APP_MODE=paid` かつ `PAID_AI_ENABLED=true` の時だけ呼び出します。

## Quick Start

```bash
cp .env.example .env
npm run dev
```

ブラウザで `http://localhost:3305` を開きます。

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

## Current Scope

現時点では、Mock/無料ローカル解析、有料AIゲート、UI/API/CLIの土台を実装しています。次の拡張候補はRSS、GitHub Trending、arXiv、Notion/Slack保存です。
