import { analyzeWithProvider } from "./ai-providers.mjs";
import { collectItems } from "./collectors.mjs";

const RANK_ORDER = { S: 0, A: 1, B: 2, C: 3 };

export async function runIntelligencePipeline(config, env = process.env) {
  const startedAt = new Date().toISOString();
  const collection = await collectItems(config);
  const rawItems = collection.items;
  const limitedItems = rawItems.slice(0, config.costGuard.maxItemsPerRun);
  const items = [];

  for (const item of limitedItems) {
    const analyzed = await analyzeWithProvider(item, config, env);
    items.push(analyzed);
  }

  const ranked = items.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  const designDocCandidates = ranked
    .filter((item) =>
      config.costGuard.deepAnalysisForSRankOnly ? item.rank === "S" : item.rank === "S" || item.rank === "A"
    )
    .slice(0, config.costGuard.maxDesignDocsPerRun)
    .map((item) => {
      const title = item.titleJa || item.title;
      return {
        itemId: item.id,
        title: `${title} 活用PoC設計書`,
        sections: [
        "背景と狙い",
        "対象業務",
        "ユーザーストーリー",
        "システム構成",
        "データ・権限・ログ",
        "評価指標",
        "リスクとfallback",
        "PoCスケジュール"
        ],
        seed: item.designDocSeeds
      };
    });

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: config.appMode,
    provider: config.aiProvider,
    counts: {
      collected: rawItems.length,
      analyzed: ranked.length,
      designDocCandidates: designDocCandidates.length,
      fallbackUsed: ranked.filter((item) => item.fallbackUsed).length,
      sourcesChecked: collection.sourceReports.length,
      sourcesOk: collection.sourceReports.filter((source) => source.status === "ok").length,
      sourceErrors: collection.sourceReports.filter((source) => source.status === "error").length
    },
    collection: {
      collectedAt: collection.collectedAt,
      usedMockFallback: collection.usedMockFallback,
      sourceReports: collection.sourceReports
    },
    items: ranked,
    designDocCandidates
  };
}
