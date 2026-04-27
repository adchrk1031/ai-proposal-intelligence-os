import { dedupeOpportunitySignals } from "./dedupe.mjs";
import { mockItems } from "./mock-data.mjs";
import { normalizeMany, normalizeOpportunitySignal } from "./normalizer.mjs";
import { mockSourceDefinition, sourceDefinitions, SOURCE_TYPES } from "./sources.mjs";

const FETCH_TIMEOUT_MS = 8000;
const HN_ITEM_LIMIT = 12;

function nowIso() {
  return new Date().toISOString();
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim();
}

function tagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeXml(match?.[1] || "");
}

function attrValue(xml, attrName) {
  const match = xml.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"));
  return decodeXml(match?.[1] || "");
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRss(xml) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return itemMatches.map((item) => ({
    title: tagValue(item, "title"),
    url: tagValue(item, "link") || tagValue(item, "guid"),
    publishedAt: tagValue(item, "pubDate") || tagValue(item, "dc:date"),
    rawSummary: tagValue(item, "description") || tagValue(item, "content:encoded")
  }));
}

function parseAtom(xml) {
  const entryMatches = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return entryMatches.map((entry) => {
    const linkTag = entry.match(/<link\b[^>]*>/i)?.[0] || "";
    return {
      title: tagValue(entry, "title"),
      url: attrValue(linkTag, "href") || tagValue(entry, "id"),
      publishedAt: tagValue(entry, "published") || tagValue(entry, "updated"),
      rawSummary: tagValue(entry, "summary") || tagValue(entry, "content")
    };
  });
}

async function collectRss(source, collectedAt) {
  const xml = await fetchText(source.url);
  const records = xml.includes("<entry") ? parseAtom(xml) : parseRss(xml);
  return normalizeMany(records, source, { collectedAt });
}

async function collectArxiv(source, collectedAt) {
  const xml = await fetchText(source.url);
  const records = parseAtom(xml).map((record) => ({
    ...record,
    rawSummary: record.rawSummary.replace(/\s+/g, " ")
  }));
  return normalizeMany(records, source, { collectedAt });
}

function parseGitHubTrending(html) {
  const articleMatches = [...html.matchAll(/<article[\s\S]*?<\/article>/gi)].map((match) => match[0]);
  return articleMatches.map((article) => {
    const repoPath = decodeXml(article.match(/href="(\/[^"]+\/[^"]+)"/i)?.[1] || "");
    const title = repoPath.replace(/^\//, "").replace(/\s+/g, "");
    const description = decodeXml(article.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "");
    return {
      title,
      url: repoPath ? `https://github.com${repoPath}` : "https://github.com/trending",
      publishedAt: new Date().toISOString(),
      rawSummary: description
    };
  });
}

async function collectGitHubTrending(source, collectedAt) {
  const html = await fetchText(source.url);
  return normalizeMany(parseGitHubTrending(html), source, { collectedAt });
}

async function collectHackerNews(source, collectedAt) {
  const ids = await fetchJson(source.url);
  const records = await Promise.all(
    ids.slice(0, HN_ITEM_LIMIT).map(async (id) => {
      const item = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return {
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${id}`,
      publishedAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
      rawSummary: item.text || `${item.score || 0} points / ${item.descendants || 0} comments`
      };
    })
  );

  return normalizeMany(records, source, { collectedAt });
}

function reportFor(source, status, count = 0, error = "") {
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.sourceType,
    sourceKind: source.sourceKind,
    url: source.url,
    status,
    itemCount: count,
    error,
    checkedAt: nowIso()
  };
}

async function collectSource(source, collectedAt) {
  if (source.sourceType === SOURCE_TYPES.ARXIV) return collectArxiv(source, collectedAt);
  if (source.sourceType === SOURCE_TYPES.GITHUB_TRENDING) return collectGitHubTrending(source, collectedAt);
  if (source.sourceType === SOURCE_TYPES.HACKER_NEWS) return collectHackerNews(source, collectedAt);
  return collectRss(source, collectedAt);
}

function collectMockItems(config, collectedAt, status = "fallback") {
  const max = config.costGuard.maxItemsPerRun;
  const items = mockItems.slice(0, max).map((item) => {
    const normalized = normalizeOpportunitySignal(
      {
        ...item,
        rawSummary: item.rawSummary || item.summary,
        tags: item.tags || item.signals
      },
      {
        ...mockSourceDefinition,
        name: item.sourceName || mockSourceDefinition.name,
        sourceKind: item.sourceKind || mockSourceDefinition.sourceKind,
        tags: item.signals || mockSourceDefinition.tags
      },
      { collectedAt, includeAll: true }
    );
    return { ...item, ...normalized };
  });

  return {
    items,
    sourceReports: [reportFor(mockSourceDefinition, status, items.length)],
    usedMockFallback: status === "fallback" || status === "mock",
    collectedAt
  };
}

export async function collectItems(config) {
  const collectedAt = nowIso();
  const max = config.costGuard.maxItemsPerRun;

  if (config.appMode === "mock") {
    return collectMockItems(config, collectedAt, "mock");
  }

  const collected = [];
  const sourceReports = [];

  const sourceResults = await Promise.all(
    sourceDefinitions.map(async (source) => {
    try {
      const items = await collectSource(source, collectedAt);
        return { source, items, report: reportFor(source, "ok", items.length) };
    } catch (error) {
        return { source, items: [], report: reportFor(source, "error", 0, error.message) };
    }
    })
  );

  for (const result of sourceResults) {
    collected.push(...result.items);
    sourceReports.push(result.report);
  }

  const deduped = dedupeOpportunitySignals(collected).slice(0, max);

  if (deduped.length === 0) {
    const fallback = collectMockItems(config, collectedAt, "fallback");
    return {
      ...fallback,
      sourceReports: [...sourceReports, ...fallback.sourceReports]
    };
  }

  return {
    items: deduped,
    sourceReports,
    usedMockFallback: false,
    collectedAt
  };
}
