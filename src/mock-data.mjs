export const mockItems = [
  {
    id: "mock-openai-agents-sdk",
    title: "OpenAI announces new agent tooling for production workflows",
    titleJa: "AIエージェントの業務実行支援が、提案書作成や社内対応に使いやすくなる",
    whatHappenedJa:
      "AIが外部ツールを扱い、評価やトレースを含めて業務フローに組み込みやすくなった。",
    proposalTitle: "営業提案書を自動下書きするAIエージェント導入",
    problemToSolve: "提案準備に時間がかかり、営業品質が担当者ごとにばらつく",
    nextAction: "既存提案書3件を使い、初稿生成PoCの入力項目を決める",
    focusArea: "AIエージェント",
    pocDifficulty: "中",
    requiredTools: ["FAQ", "提案書テンプレート", "業務ツール連携"],
    sourceKind: "official",
    sourceName: "OpenAI Blog",
    url: "https://openai.com/",
    publishedAt: "2026-04-24T08:00:00.000Z",
    summary:
      "New agent tooling improves tool use, evaluation loops, tracing, and safer handoffs between models and external systems.",
    signals: ["agent", "workflow", "tool use", "evaluation", "production"]
  },
  {
    id: "mock-context-caching",
    title: "Gemini model update improves long-context cost efficiency",
    titleJa: "Geminiの長文処理コスト改善で、社内ナレッジ検索が安く使いやすくなる",
    whatHappenedJa:
      "長文コンテキストとキャッシュにより、同じ資料を繰り返し読む業務のコストを抑えやすくなった。",
    proposalTitle: "社内PDFと議事録を横断検索するナレッジAI",
    problemToSolve: "資料が分散し、必要な情報を探すだけで時間が溶ける",
    nextAction: "よく使うPDF・議事録を10件選び、検索と要約のPoC対象にする",
    focusArea: "長文処理",
    pocDifficulty: "低",
    requiredTools: ["PDF", "議事録", "RAG"],
    sourceKind: "official",
    sourceName: "Google AI Developers",
    url: "https://ai.google.dev/",
    publishedAt: "2026-04-23T09:30:00.000Z",
    summary:
      "Context caching and long-context improvements reduce repeated prompt cost for document-heavy enterprise workflows.",
    signals: ["long context", "cache", "documents", "cost reduction"]
  },
  {
    id: "mock-github-mcp-server",
    title: "MCP server repository trends among developer productivity tools",
    titleJa: "MCPでGitHub・Notion・Slackをつなぐ開発支援AIを作りやすくなる",
    whatHappenedJa:
      "AIアシスタントが社内ツールやリポジトリへ安全に接続する実装パターンが広がっている。",
    proposalTitle: "開発チーム向けAIオペレーション支援",
    problemToSolve: "Issue、仕様、Slackの文脈が分散し、状況把握と引き継ぎに時間がかかる",
    nextAction: "GitHub IssueとNotion仕様書を対象に、朝会用サマリーを生成する",
    focusArea: "社内ツール連携",
    pocDifficulty: "中",
    requiredTools: ["GitHub", "Notion", "Slack"],
    sourceKind: "github",
    sourceName: "GitHub Trending",
    url: "https://github.com/trending",
    publishedAt: "2026-04-22T12:10:00.000Z",
    summary:
      "A popular MCP server pattern connects AI assistants to internal tools, repositories, issue trackers, and knowledge bases.",
    signals: ["mcp", "developer tools", "internal knowledge", "automation"]
  },
  {
    id: "mock-paper-small-agents",
    title: "Research explores smaller specialist agents for enterprise tasks",
    titleJa: "専門エージェント分担で、問い合わせ分類や申請チェックの精度を上げられる",
    whatHappenedJa:
      "1つの大きなAIに任せるより、業務別の小さな専門AIへ振り分ける設計が有効と示された。",
    proposalTitle: "問い合わせを専門部署へ振り分けるAIルーティング",
    problemToSolve: "問い合わせ分類や申請確認が属人化し、対応漏れや手戻りが起きる",
    nextAction: "問い合わせカテゴリを5つに絞り、専門エージェント分岐の評価観点を作る",
    focusArea: "専門エージェント",
    pocDifficulty: "中",
    requiredTools: ["問い合わせログ", "分類ルール", "評価データ"],
    sourceKind: "paper",
    sourceName: "arXiv",
    url: "https://arxiv.org/",
    publishedAt: "2026-04-21T06:45:00.000Z",
    summary:
      "The paper compares a single large model with routed specialist agents and reports better reliability on narrow business workflows.",
    signals: ["multi-agent", "routing", "reliability", "enterprise"]
  }
];
