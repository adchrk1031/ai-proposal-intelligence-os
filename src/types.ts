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

export type RawItem = {
  id: string;
  title: string;
  sourceKind: SourceKind;
  sourceName: string;
  url: string;
  publishedAt: string;
  summary: string;
  signals: string[];
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
