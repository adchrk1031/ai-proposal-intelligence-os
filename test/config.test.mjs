import test from "node:test";
import assert from "node:assert/strict";
import { getConfig, shouldUsePaidAi } from "../src/config.mjs";

test("mock mode never enables paid AI provider", () => {
  const config = getConfig({
    APP_MODE: "mock",
    AI_PROVIDER: "openai",
    PAID_AI_ENABLED: "true"
  });

  assert.equal(config.aiProvider, "mock");
  assert.equal(shouldUsePaidAi(config), false);
});

test("free mode ignores paid provider even with key switch", () => {
  const config = getConfig({
    APP_MODE: "free",
    AI_PROVIDER: "gemini",
    PAID_AI_ENABLED: "true"
  });

  assert.equal(config.aiProvider, "mock");
  assert.equal(shouldUsePaidAi(config), false);
});

test("paid mode requires PAID_AI_ENABLED=true", () => {
  const disabled = getConfig({
    APP_MODE: "paid",
    AI_PROVIDER: "openai",
    PAID_AI_ENABLED: "false"
  });
  const enabled = getConfig({
    APP_MODE: "paid",
    AI_PROVIDER: "openai",
    PAID_AI_ENABLED: "true"
  });

  assert.equal(disabled.aiProvider, "mock");
  assert.equal(shouldUsePaidAi(disabled), false);
  assert.equal(enabled.aiProvider, "openai");
  assert.equal(shouldUsePaidAi(enabled), true);
});
