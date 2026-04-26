import fs from "node:fs";
import path from "node:path";

const APP_MODES = new Set(["mock", "free", "paid"]);
const AI_PROVIDERS = new Set(["mock", "gemini", "openai"]);

export function loadDotEnv(filePath = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

function parseMode(value) {
  return APP_MODES.has(value) ? value : "mock";
}

function parseProvider(value) {
  return AI_PROVIDERS.has(value) ? value : "mock";
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(env = process.env) {
  const appMode = parseMode(env.APP_MODE);
  const requestedProvider = parseProvider(env.AI_PROVIDER);
  const paidAiEnabled = parseBool(env.PAID_AI_ENABLED, false);

  const costGuard = {
    paidAiEnabled,
    maxItemsPerRun: parsePositiveInt(env.MAX_ITEMS_PER_RUN, 30),
    maxDesignDocsPerRun: parsePositiveInt(env.MAX_DESIGN_DOCS_PER_RUN, 3),
    deepAnalysisForSRankOnly: parseBool(env.DEEP_ANALYSIS_FOR_S_RANK_ONLY, true)
  };

  const provider = appMode === "paid" && paidAiEnabled ? requestedProvider : "mock";

  return {
    appMode,
    aiProvider: provider,
    requestedProvider,
    costGuard,
    openaiModel: env.OPENAI_MODEL || "gpt-5.4-mini",
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
    hasNotionConfig: Boolean(env.NOTION_API_KEY && env.NOTION_DATABASE_ID),
    hasSlackWebhook: Boolean(env.SLACK_WEBHOOK_URL),
    cronEnabled: Boolean(env.CRON_SECRET)
  };
}

export function getSecrets(env = process.env) {
  return {
    geminiApiKey: env.GEMINI_API_KEY || "",
    openAiApiKey: env.OPENAI_API_KEY || "",
    slackWebhookUrl: env.SLACK_WEBHOOK_URL || "",
    notionApiKey: env.NOTION_API_KEY || "",
    notionDatabaseId: env.NOTION_DATABASE_ID || "",
    cronSecret: env.CRON_SECRET || ""
  };
}

export function shouldUsePaidAi(config) {
  return config.appMode === "paid" && config.costGuard.paidAiEnabled;
}

export function publicConfig(config) {
  return {
    appMode: config.appMode,
    aiProvider: config.aiProvider,
    requestedProvider: config.requestedProvider,
    costGuard: config.costGuard,
    openaiModel: config.openaiModel,
    integrations: {
      geminiConfigured: config.hasGeminiKey,
      openaiConfigured: config.hasOpenAiKey,
      notionConfigured: config.hasNotionConfig,
      slackConfigured: config.hasSlackWebhook,
      cronConfigured: config.cronEnabled
    }
  };
}
