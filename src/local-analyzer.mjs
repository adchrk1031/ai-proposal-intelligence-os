const USE_CASE_MAP = [
  {
    keywords: ["agent", "workflow", "tool use", "automation"],
    useCases: ["営業提案書の自動下書き", "社内問い合わせ一次対応", "業務手順の自動実行支援"],
    companies: ["SaaS企業", "BPO企業", "情シス部門を持つ中堅企業"],
    poc: "既存FAQと業務ツールを接続した社内AIエージェントPoC"
  },
  {
    keywords: ["long context", "documents", "cache", "cost"],
    useCases: ["契約書・仕様書の横断検索", "議事録からの要件抽出", "大量PDFの比較レビュー"],
    companies: ["士業事務所", "製造業の品質保証部門", "不動産・金融企業"],
    poc: "長文ドキュメントを読み込むRAG/要約コスト削減PoC"
  },
  {
    keywords: ["mcp", "developer tools", "repositories"],
    useCases: ["GitHub issue triage", "開発ナレッジ検索", "社内ツール横断オペレーション"],
    companies: ["プロダクト開発会社", "受託開発会社", "DX推進部門"],
    poc: "GitHub・Notion・Slackをつなぐ開発AIアシスタントPoC"
  },
  {
    keywords: ["multi-agent", "routing", "reliability"],
    useCases: ["問い合わせ分類", "稟議・申請チェック", "専門部署への自動ルーティング"],
    companies: ["コンタクトセンター", "保険会社", "バックオフィス業務の多い企業"],
    poc: "業務カテゴリ別の専門エージェント分岐PoC"
  }
];

function scoreItem(item) {
  const text = `${item.title} ${item.summary} ${item.signals.join(" ")}`.toLowerCase();
  let score = 0;
  for (const rule of USE_CASE_MAP) {
    score += rule.keywords.filter((keyword) => text.includes(keyword)).length;
  }
  if (item.sourceKind === "official") score += 2;
  if (item.sourceKind === "github" || item.sourceKind === "paper") score += 1;
  return score;
}

function rankFromScore(score) {
  if (score >= 6) return "S";
  if (score >= 4) return "A";
  if (score >= 2) return "B";
  return "C";
}

function matchingRules(item) {
  const text = `${item.title} ${item.summary} ${item.signals.join(" ")}`.toLowerCase();
  return USE_CASE_MAP.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );
}

export function analyzeLocally(item, providerUsed = "mock", fallbackUsed = false) {
  const rules = matchingRules(item);
  const score = scoreItem(item);
  const useCases = [...new Set(rules.flatMap((rule) => rule.useCases))];
  const targetCompanies = [...new Set(rules.flatMap((rule) => rule.companies))];
  const pocIdeas = [...new Set(rules.map((rule) => rule.poc))];

  const firstSignal = item.signals[0] || "AI活用";
  const businessUseCases = useCases.length ? useCases : ["業務ナレッジ整理", "提案資料作成支援"];
  const companies = targetCompanies.length ? targetCompanies : ["AI活用を検討する中堅企業"];
  const pocs = pocIdeas.length ? pocIdeas : [`${firstSignal}を使った業務改善PoC`];

  return {
    ...item,
    rank: rankFromScore(score),
    whatUpdated: `${item.sourceName}の情報から、${firstSignal}周辺の実務適用余地が広がったと判断できます。`,
    whatBecamePossible: [
      `${firstSignal}を既存業務フローに組み込む`,
      "AI活用テーマを提案・PoC・設計書の単位に分解する",
      "営業前の仮説構築と社内共有を短時間で作る"
    ],
    businessUseCases,
    targetCompanies: companies,
    pocIdeas: pocs,
    designDocSeeds: [
      "目的・対象業務・利用者・成功指標",
      "入力データ、外部ツール連携、権限設計",
      "AI失敗時のfallback、監査ログ、評価観点"
    ],
    businessDevelopmentAngles: [
      "既存業務の時間削減を入口に小さく導入する",
      "部門横断のナレッジ基盤として横展開する",
      "PoC後に運用設計・教育・保守まで提案する"
    ],
    salesTalk: `「${item.title}」の流れを使うと、単なるAI導入ではなく、${businessUseCases[0]}から始める具体的な改善提案にできます。`,
    internalShare: `【AI提案ネタ】${item.title}\n更新点: ${item.summary}\n提案先: ${companies.join("、")}\nPoC案: ${pocs[0]}`,
    socialPost: `${item.title}\n\n注目点は「ニュース」ではなく、${businessUseCases[0]}のような業務PoCに変換できること。AI情報は提案資産として整理すると価値が出ます。`,
    providerUsed,
    fallbackUsed
  };
}
