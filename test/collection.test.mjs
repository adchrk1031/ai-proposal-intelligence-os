import test from "node:test";
import assert from "node:assert/strict";
import { dedupeOpportunitySignals } from "../src/dedupe.mjs";
import { normalizeOpportunitySignal } from "../src/normalizer.mjs";

const source = {
  id: "test-rss",
  name: "Test RSS",
  sourceType: "rss",
  sourceKind: "news",
  url: "https://example.com/feed.xml",
  tags: ["ai"]
};

test("normalizer keeps the OpportunitySignal fields", () => {
  const item = normalizeOpportunitySignal(
    {
      title: "New AI agent workflow",
      url: "https://example.com/post?utm_source=x",
      publishedAt: "2026-04-26T00:00:00.000Z",
      rawSummary: "<p>Agent workflow for enterprise automation.</p>"
    },
    source,
    { collectedAt: "2026-04-26T01:00:00.000Z" }
  );

  assert.equal(item.sourceName, "Test RSS");
  assert.equal(item.sourceType, "rss");
  assert.equal(item.rawSummary, "Agent workflow for enterprise automation.");
  assert.equal(item.collectedAt, "2026-04-26T01:00:00.000Z");
  assert.ok(item.tags.includes("ai"));
});

test("dedupe removes duplicate URLs with tracking params", () => {
  const items = [
    { title: "AI update", sourceName: "A", url: "https://example.com/post?utm_source=x" },
    { title: "AI update", sourceName: "A", url: "https://example.com/post" },
    { title: "Different AI update", sourceName: "A", url: "https://example.com/other" }
  ];

  assert.equal(dedupeOpportunitySignals(items).length, 2);
});
