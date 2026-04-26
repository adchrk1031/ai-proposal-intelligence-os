import test from "node:test";
import assert from "node:assert/strict";
import { getConfig } from "../src/config.mjs";
import { runIntelligencePipeline } from "../src/pipeline.mjs";

test("pipeline creates proposal intelligence in mock mode", async () => {
  const config = getConfig({
    APP_MODE: "mock",
    AI_PROVIDER: "mock",
    PAID_AI_ENABLED: "false",
    MAX_ITEMS_PER_RUN: "2",
    MAX_DESIGN_DOCS_PER_RUN: "1",
    DEEP_ANALYSIS_FOR_S_RANK_ONLY: "true"
  });

  const result = await runIntelligencePipeline(config, {});

  assert.equal(result.mode, "mock");
  assert.equal(result.provider, "mock");
  assert.equal(result.counts.analyzed, 2);
  assert.ok(result.items[0].salesTalk.includes("具体的な改善提案"));
  assert.ok(result.designDocCandidates.length <= 1);
});
