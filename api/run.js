import { getConfig, loadDotEnv } from "../src/config.mjs";
import { runIntelligencePipeline } from "../src/pipeline.mjs";

loadDotEnv();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method not allowed" }, null, 2));
    return;
  }

  try {
    const config = getConfig();
    const result = await runIntelligencePipeline(config);
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(result, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
