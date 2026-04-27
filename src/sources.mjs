export const SOURCE_TYPES = {
  RSS: "rss",
  ARXIV: "arxiv",
  GITHUB_TRENDING: "github_trending",
  HACKER_NEWS: "hacker_news",
  OFFICIAL_BLOG: "official_blog",
  MOCK: "mock"
};

export const sourceDefinitions = [
  {
    id: "openai-blog",
    name: "OpenAI Blog",
    sourceType: SOURCE_TYPES.OFFICIAL_BLOG,
    sourceKind: "official",
    url: "https://openai.com/blog/rss.xml",
    tags: ["official", "openai", "llm"]
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    sourceType: SOURCE_TYPES.OFFICIAL_BLOG,
    sourceKind: "official",
    url: "https://blog.google/technology/ai/rss/",
    tags: ["official", "google", "llm"]
  },
  {
    id: "anthropic-news",
    name: "Anthropic News",
    sourceType: SOURCE_TYPES.OFFICIAL_BLOG,
    sourceKind: "official",
    url: "https://www.anthropic.com/news/rss.xml",
    tags: ["official", "anthropic", "llm"]
  },
  {
    id: "microsoft-ai-blog",
    name: "Microsoft AI Blog",
    sourceType: SOURCE_TYPES.RSS,
    sourceKind: "tech_blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    tags: ["microsoft", "enterprise", "ai"]
  },
  {
    id: "arxiv-ai",
    name: "arXiv AI",
    sourceType: SOURCE_TYPES.ARXIV,
    sourceKind: "paper",
    url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=10",
    tags: ["paper", "research", "arxiv"]
  },
  {
    id: "github-trending-ai",
    name: "GitHub Trending AI",
    sourceType: SOURCE_TYPES.GITHUB_TRENDING,
    sourceKind: "github",
    url: "https://github.com/trending?spoken_language_code=&since=daily",
    tags: ["github", "developer-tools", "oss"]
  },
  {
    id: "hacker-news-ai",
    name: "Hacker News AI",
    sourceType: SOURCE_TYPES.HACKER_NEWS,
    sourceKind: "news",
    url: "https://hacker-news.firebaseio.com/v0/topstories.json",
    tags: ["hacker-news", "discussion", "startup"]
  }
];

export const mockSourceDefinition = {
  id: "mock-seed",
  name: "Mock Seed",
  sourceType: SOURCE_TYPES.MOCK,
  sourceKind: "news",
  url: "local://mock-data",
  tags: ["mock", "fallback"]
};

export function publicSourceDefinitions() {
  return sourceDefinitions.map(({ id, name, sourceType, sourceKind, url, tags }) => ({
    id,
    name,
    sourceType,
    sourceKind,
    url,
    tags
  }));
}
