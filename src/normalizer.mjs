import crypto from "node:crypto";

const AI_KEYWORDS = [
  "ai",
  "agent",
  "agents",
  "artificial intelligence",
  "automation",
  "benchmark",
  "chatgpt",
  "claude",
  "copilot",
  "diffusion",
  "embedding",
  "gemini",
  "github copilot",
  "gpt",
  "llm",
  "machine learning",
  "mcp",
  "model",
  "multimodal",
  "openai",
  "rag",
  "reasoning",
  "生成ai",
  "人工知能"
];

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function inferTags(record, source) {
  const text = `${record.title || ""} ${record.rawSummary || ""} ${(source.tags || []).join(" ")}`.toLowerCase();
  const matched = AI_KEYWORDS.filter((keyword) => text.includes(keyword));
  return [...new Set([...(source.tags || []), ...matched])].slice(0, 10);
}

function isAiRelated(record, source) {
  const tags = inferTags(record, source);
  const text = `${record.title || ""} ${record.rawSummary || ""}`.toLowerCase();
  return tags.some((tag) => AI_KEYWORDS.includes(tag)) || AI_KEYWORDS.some((keyword) => text.includes(keyword));
}

function buildId(source, url, title) {
  const digest = crypto
    .createHash("sha1")
    .update(`${source.id}:${url || ""}:${title || ""}`)
    .digest("hex")
    .slice(0, 12);
  return `${source.id}-${digest}`;
}

export function normalizeOpportunitySignal(record, source, options = {}) {
  const title = stripHtml(record.title || "Untitled AI update");
  const rawSummary = stripHtml(record.rawSummary || record.summary || "");
  const url = record.url || source.url;
  const tags = inferTags({ title, rawSummary }, source);
  const collectedAt = options.collectedAt || new Date().toISOString();

  return {
    id: record.id || buildId(source, url, title),
    title,
    sourceKind: source.sourceKind,
    sourceType: source.sourceType,
    sourceName: source.name,
    sourceId: source.id,
    url,
    publishedAt: isoDate(record.publishedAt),
    rawSummary,
    summary: rawSummary || title,
    tags,
    signals: tags,
    collectedAt
  };
}

export function normalizeMany(records, source, options = {}) {
  return records
    .map((record) => normalizeOpportunitySignal(record, source, options))
    .filter((item) => options.includeAll || isAiRelated(item, source));
}
