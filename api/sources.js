import { publicSourceDefinitions } from "../src/sources.mjs";

export default function handler(_req, res) {
  try {
    const sources = { sources: publicSourceDefinitions() };
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(sources, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
}
