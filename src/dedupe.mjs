function canonicalUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref" || key === "source") {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

function canonicalTitle(title = "") {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeOpportunitySignals(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const urlKey = canonicalUrl(item.url);
    const titleKey = canonicalTitle(item.title);
    const key = urlKey || `${item.sourceName}:${titleKey}`;
    const fuzzyKey = `${item.sourceName}:${titleKey}`;

    if (seen.has(key) || seen.has(fuzzyKey)) continue;

    seen.add(key);
    seen.add(fuzzyKey);
    deduped.push(item);
  }

  return deduped;
}
