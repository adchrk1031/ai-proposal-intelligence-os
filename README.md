# AI Proposal Intelligence OS

海外AI情報を「読んで終わり」にせず、提案ネタ、PoC案、設計書の種、営業トーク、社内共有文、SNS投稿に変換するためのAI事業開発ナレッジ基盤です。

継続開発時の恒久ルールと設計原則は [AGENTS.md](/Users/adachih/Codex/AI%20News/AGENTS.md) を参照してください。

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
- `GET /api/sources`: 外部収集入口のソース定義を返す
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

## Step 2.5 Morning Brief Polish

Today画面を「毎朝5分で見られるAI Opportunity Brief」としてさらに圧縮しました。

- 上部ヘッダーを小さくし、日付、Mode、推定コスト、Run Intelligenceをすぐ確認できる配置に変更
- 最上部に「今日の結論」「今日の注目領域」「おすすめアクション」をまとめた短いブリーフカードを追加
- TOP3カードは縦読み構成に変更し、日本語タイトル、何が起きたか、何ができるようになったか、使える業務、提案ネタ、次アクションだけを表示
- Mockデータに日本語タイトル、提案タイトル、解決課題、PoC難易度、必要ツールを追加
- Design Docsへの導線をToday上部のサイドブロックへ移動
- 色と装飾をネイビー、グレー、薄いミント中心に抑え、影も薄く調整
- スマホではTOP3が早く見えるよう、カードとボタンを1カラムで大きめに表示

## Step 3 Collection Entry

外部API連携の本格化前に、公開ソースをOpportunitySignal形式へ正規化する入口を追加しました。OpenAI/Geminiでの深いAI分析、Notion保存、Slack通知、GitHub Actions本格運用、X API連携はまだ行っていません。

### Implemented Collectors

- RSS Collector: 一般RSS/Atomを取得
- arXiv Collector: arXiv Atom APIを取得
- Official Blog RSS Collector: OpenAI、Google AI、Anthropic、Microsoft AIなどの公式ブログ入口
- GitHub Trending Collector: HTML取得ベースの雛形
- Hacker News Collector: Firebase公開APIベースの雛形
- Mock fallback: `APP_MODE=mock` または外部取得0件/失敗時にMockへ戻す

### Normalized Shape

収集したデータは、後続の提案変換に渡しやすいように以下を保持します。

```ts
type OpportunitySignal = {
  title: string;
  url: string;
  sourceName: string;
  sourceType: string;
  publishedAt: string;
  rawSummary: string;
  tags: string[];
  collectedAt: string;
};
```

### Source Status

`/api/run` の結果に `collection.sourceReports` を含め、Sources画面で各ソースの取得状態、件数、エラー、Mock fallback有無を確認できます。

## Step 3.5 UI/UX Polish

外部API連携やAI分析ロジックを変更せず、毎朝5分で読める「AI Opportunity Brief」体験へUIを磨き込みました。

- 背景、カード、文字色、境界線をNotion-likeな落ち着いたトーンへ調整
- Today画面を「日付 → 今日の結論 → TOP3 → できること → 提案ネタ → 設計書 → 次アクション」の順に再構成
- TOP3カードは日本語タイトルを主役にし、英語タイトルは小さく補足表示
- Sources画面に有効ソース数、成功、エラー、Mock fallback、推定コストのサマリーを追加
- Timelineは日次Briefカード形式に変更
- Ideasは対象業界、対象部署、解決課題、PoC難易度、事業インパクト、関連設計書を表示
- Design Docsは元ネタ、対象業務、PoC範囲、必要ツール、次アクションを表示
- Daily Brief、Design Doc、提案トーク、SNS投稿案のコピー導線を追加
- スマホでは上部ナビ、1カラムカード、大きめボタンで読みやすく調整

## Step 3.6 Decision-First UI

Step3.6では、読む画面ではなく「判断する画面」としてさらに情報量を減らしました。外部API連携、Collector、Cost Guard、APP_MODE/AI_PROVIDER/PAID_AI_ENABLEDの安全設計は変更していません。

- Todayを「Compact Header → 今日の結論 → 今日できることTOP3 → 次にやること → 提案ネタ → 設計書 → Sources簡易ステータス」に再構成
- TOP3はニュースタイトルではなく「できること」を主語に表示
- カード本文は最大2行に抑え、詳細は `詳しく見る` に収納
- Ideasは提案タイトル、対象、解決課題、期待効果だけを主表示
- Design DocsはPoC候補として、目的、必要ツール、難易度だけを主表示
- Sourcesは正常、エラー、Mock fallback、今日のコストを先に表示
- Timelineは日付、結論1行、件数、開くボタンだけに圧縮
- Mockデータに短い `capabilityTitle` / `shortDescription` / `expectedEffect` を追加

## Step 3.8 Product Polish

Step3.8では、機能追加ではなくUI/UXの完成度を上げ、Todayを「3秒で判断する」画面へさらに整理しました。外部API連携、Collector、Cost Guard、モード制御、有料APIを呼ばない安全設計は変更していません。

- Top Barを `AI Proposal OS`、日付、モード、推定コスト、Runだけに圧縮
- Todayを「今日の結論 → 今日できることTOP3 → 次にやること → 提案ネタ → 設計書 → 収集状態」の順に整理
- TOP3はニュース名ではなく、日本語の「できることタイトル」を主役に表示
- カード本文を短くし、英語タイトル、長い営業トーク、SNS投稿案、設計書本文、Source詳細は `詳しく見る` やコピーに収納
- Ideasは提案タイトル、対象、解決課題、期待効果、難易度、コピーだけを主表示
- Design DocsはPoC候補を選ぶ画面として、目的、必要ツール、難易度、次アクションを主表示
- Sourcesは正常、エラー、Mock、今日のコストを先に表示し、詳細ソースは折りたたみに変更
- コピー後のメッセージを `Slackに貼れます`、`SNS投稿案をコピーしました`、`Notion用Markdownをコピーしました` のように用途別に表示
- Mockデータに短い営業トークとSNS投稿案を追加し、次アクションも40字以内を目安に短文化
- CSSを整理し、白基調、薄い境界線、余白多め、スマホ1カラムの業務ツールUIに調整

## Step 4 Daily Proposal OS

Step4では、見た目の整理だけでなく「毎朝3分で判断する」運用体験へ寄せました。ニュース一覧ではなく、今日どれを提案・PoC・設計書候補に進めるべきかを最短で判断できるUIを目指しています。

### Current UI Concept

- ChatGPT / Notion / Slack / LINE / Codex のような、白ベースで余白多めの軽いUI
- ニュースアプリではなく、提案OSとして「判断 → 共有 → 次アクション」へ進みやすい構成
- 色は重要度や状態表示にだけ使い、装飾ではなく階層と余白で理解しやすくする
- Briefカードを主役にし、Sourcesやログは運用確認として一段下に置く

### Screen Layout

- `Today`: ヒーロー、4つのサマリー、最小フィルター、Briefカード、次にやること、設計書候補、収集ログ
- `Timeline`: 今日 / 昨日 / 今週 / 保存済みBrief / 新規ネタ / 更新されたネタ / 提案化済み / Slack共有済み / Notion保存済み を確認
- `Ideas`: 提案ネタとして使える項目を優先理由付きで一覧表示
- `Design Docs`: 設計書候補をPoCの下書きとして確認
- `Sources`: source name, status, fetched count, last fetched at, error reason, success rate, 直近エラー, fallback使用有無を確認

### Brief Card Priority Rules

Briefカードは単純なランク順ではなく、ルールベースの「今日やる価値順」で並べています。スコアリング関数はフロント側に分離してあり、将来はLLMスコアリングに置き換えやすい構成です。

- `S` ランクを最優先
- `A` ランクを次点で優先
- PoC候補を優先
- 設計書候補を優先
- 社内活用しやすいテーマを優先
- 3日以内に試せるテーマを優先
- 営業提案に使いやすいテーマを優先
- 新しい情報を優先
- 同じようなテーマが並びすぎないように、focus areaベースで軽く分散

カード上には `S / PoC候補 / 3日以内に試せる` のように、上位理由をそのまま表示します。

### Mock Run

Web UI:

```bash
cp .env.example .env
node src/server.mjs
```

CLIでMock実行:

```bash
node src/cli.mjs
```

`npm run run:mock` でも同じMock実行ができます。

### Testing

```bash
node --test
node --check public/app.js
node src/cli.mjs
```

確認ポイント:

- 既存テストが通ること
- フロントの構文が壊れていないこと
- Mock実行でBrief、設計書候補、Sources情報が返ること

### Current Scope

現時点では、Mock/無料ローカル解析、有料AIゲート、UI/API/CLI、Step3の外部収集入口、Step4のDaily Proposal OS UIまでを実装しています。

### Next

次の優先テーマは以下です。

- 実データ収集の安定化
- ローカル保存
- 差分管理
- Slack通知
- Notion保存

次の拡張候補は、収集結果のローカル永続化、RSS対象の調整、Step4以降のAI分析強化、Notion/Slack保存です。
