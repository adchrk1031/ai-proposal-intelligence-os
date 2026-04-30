import { getConfig, loadDotEnv, publicConfig } from "../src/config.mjs";

loadDotEnv();

export default function handler(_req, res) {
  try {
    const config = publicConfig(getConfig());
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(config, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
