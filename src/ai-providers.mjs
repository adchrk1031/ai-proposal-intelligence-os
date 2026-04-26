import { analyzeLocally } from "./local-analyzer.mjs";
import { getSecrets, shouldUsePaidAi } from "./config.mjs";

function intelligencePrompt(item) {
  return [
    "You are an AI product strategist for Japanese enterprise proposals.",
    "Return compact JSON only with these keys:",
    "whatUpdated, whatBecamePossible, businessUseCases, targetCompanies, pocIdeas, designDocSeeds, businessDevelopmentAngles, salesTalk, internalShare, socialPost.",
    "All values must be Japanese. Array keys must be arrays of strings.",
    "",
    JSON.stringify(item)
  ].join("\n");
}

function safeParseJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function mergeAiResult(item, aiResult, providerUsed) {
  const local = analyzeLocally(item, providerUsed, false);
  return {
    ...local,
    whatUpdated: aiResult.whatUpdated || local.whatUpdated,
    whatBecamePossible: aiResult.whatBecamePossible || local.whatBecamePossible,
    businessUseCases: aiResult.businessUseCases || local.businessUseCases,
    targetCompanies: aiResult.targetCompanies || local.targetCompanies,
    pocIdeas: aiResult.pocIdeas || local.pocIdeas,
    designDocSeeds: aiResult.designDocSeeds || local.designDocSeeds,
    businessDevelopmentAngles:
      aiResult.businessDevelopmentAngles || local.businessDevelopmentAngles,
    salesTalk: aiResult.salesTalk || local.salesTalk,
    internalShare: aiResult.internalShare || local.internalShare,
    socialPost: aiResult.socialPost || local.socialPost,
    providerUsed,
    fallbackUsed: false
  };
}

async function analyzeWithGemini(item, secrets) {
  if (!secrets.geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(secrets.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: intelligencePrompt(item) }] }]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return mergeAiResult(item, safeParseJson(text), "gemini");
}

async function analyzeWithOpenAi(item, secrets, config) {
  if (!secrets.openAiApiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secrets.openAiApiKey}`
    },
    body: JSON.stringify({
      model: config.openaiModel,
      input: intelligencePrompt(item)
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output?.flatMap((part) => part.content || [])
      ?.map((content) => content.text || "")
      ?.join("\n") ||
    "";

  return mergeAiResult(item, safeParseJson(text), "openai");
}

export async function analyzeWithProvider(item, config, env = process.env) {
  if (!shouldUsePaidAi(config) || config.aiProvider === "mock") {
    return analyzeLocally(item, "mock", config.appMode !== "mock");
  }

  const secrets = getSecrets(env);

  try {
    if (config.aiProvider === "gemini") {
      return await analyzeWithGemini(item, secrets);
    }
    if (config.aiProvider === "openai") {
      return await analyzeWithOpenAi(item, secrets, config);
    }
  } catch (error) {
    const fallback = analyzeLocally(item, "mock", true);
    fallback.providerError = error.message;
    return fallback;
  }

  return analyzeLocally(item, "mock", true);
}
