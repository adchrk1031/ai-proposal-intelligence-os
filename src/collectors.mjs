import { mockItems } from "./mock-data.mjs";

export async function collectItems(config) {
  const max = config.costGuard.maxItemsPerRun;

  // Free first: the initial build uses deterministic local seed data.
  // RSS/GitHub/arXiv collectors can be added here without changing the pipeline.
  return mockItems.slice(0, max);
}
