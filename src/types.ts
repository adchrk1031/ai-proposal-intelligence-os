export type AppMode = "mock" | "free" | "paid";

export type AiProvider = "mock" | "gemini" | "openai";

export type CostGuard = {
  paidAiEnabled: boolean;
  maxItemsPerRun: number;
  maxDesignDocsPerRun: number;
  deepAnalysisForSRankOnly: boolean;
};

export type IntelligenceRank = "S" | "A" | "B" | "C";

export type SourceKind =
  | "official"
  | "paper"
  | "tech_blog"
  | "github"
  | "sns"
  | "news";

export type SourceType =
  | "rss"
  | "arxiv"
  | "github_trending"
  | "hacker_news"
  | "official_blog"
  | "mock";

export type OpportunitySignal = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  sourceKind: SourceKind;
  publishedAt: string;
  rawSummary: string;
  tags: string[];
  collectedAt: string;
};

export type RawItem = {
  id: string;
  title: string;
  sourceKind: SourceKind;
  sourceType?: SourceType;
  sourceId?: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  rawSummary?: string;
  summary: string;
  tags?: string[];
  signals: string[];
  collectedAt?: string;
};

export type IntelligenceItem = RawItem & {
  rank: IntelligenceRank;
  whatUpdated: string;
  whatBecamePossible: string[];
  businessUseCases: string[];
  targetCompanies: string[];
  pocIdeas: string[];
  designDocSeeds: string[];
  businessDevelopmentAngles: string[];
  salesTalk: string;
  internalShare: string;
  socialPost: string;
  providerUsed: AiProvider;
  fallbackUsed: boolean;
};
