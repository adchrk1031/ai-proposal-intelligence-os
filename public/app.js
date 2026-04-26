const runButton = document.querySelector("#runButton");
const itemsEl = document.querySelector("#items");
const docsEl = document.querySelector("#designDocs");

function setText(id, value) {
  document.querySelector(id).textContent = value;
}

function list(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function renderConfig(config) {
  setText("#mode", config.appMode);
  setText("#provider", config.aiProvider);
  setText("#paidAi", String(config.costGuard.paidAiEnabled));
  setText("#limit", `${config.costGuard.maxItemsPerRun} items`);
}

function renderResult(result) {
  setText("#collected", result.counts.collected);
  setText("#analyzed", result.counts.analyzed);
  setText("#docs", result.counts.designDocCandidates);
  setText("#fallback", result.counts.fallbackUsed);
  setText("#timestamp", `Last run: ${new Date(result.finishedAt).toLocaleString("ja-JP")}`);

  itemsEl.innerHTML = result.items
    .map(
      (item) => `
        <article class="item">
          <div class="rank ${item.rank}">${item.rank}</div>
          <div>
            <h3>${item.title}</h3>
            <div class="meta">${item.sourceName} / ${item.sourceKind} / provider: ${item.providerUsed}${item.fallbackUsed ? " / fallback" : ""}</div>
            <p>${item.whatUpdated}</p>
            <div class="chips">
              ${item.targetCompanies.map((company) => `<span class="chip">${company}</span>`).join("")}
            </div>
            <div class="detail-grid">
              <div>
                <strong>できること</strong>
                <ul>${list(item.whatBecamePossible)}</ul>
              </div>
              <div>
                <strong>業務活用</strong>
                <ul>${list(item.businessUseCases)}</ul>
              </div>
              <div>
                <strong>PoC</strong>
                <ul>${list(item.pocIdeas)}</ul>
              </div>
            </div>
            <p><strong>営業トーク:</strong> ${item.salesTalk}</p>
          </div>
        </article>
      `
    )
    .join("");

  docsEl.innerHTML = result.designDocCandidates
    .map(
      (doc) => `
        <article class="doc">
          <h3>${doc.title}</h3>
          <ol>${list(doc.sections)}</ol>
        </article>
      `
    )
    .join("");
}

async function loadConfig() {
  const response = await fetch("/api/config");
  renderConfig(await response.json());
}

async function runPipeline() {
  runButton.disabled = true;
  runButton.textContent = "Running...";
  try {
    const response = await fetch("/api/run", { method: "POST" });
    renderResult(await response.json());
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Run Intelligence";
  }
}

runButton.addEventListener("click", runPipeline);

await loadConfig();
await runPipeline();
