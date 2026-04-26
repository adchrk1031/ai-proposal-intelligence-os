import { getConfig, loadDotEnv } from "./config.mjs";
import { runIntelligencePipeline } from "./pipeline.mjs";

loadDotEnv();

const result = await runIntelligencePipeline(getConfig());
console.log(JSON.stringify(result, null, 2));
