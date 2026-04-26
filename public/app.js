const runButton = document.querySelector("#runButton");
const contentEl = document.querySelector("#content");
const noticeEl = document.querySelector("#notice");
const navItems = [...document.querySelectorAll(".nav-item")];

const state = {
  activeView: "today",
  config: null,
  result: null,
  loading: true,
  error: null
};

const viewTitles = {
  today: "今日のAI Opportunity Brief",
  timeline: "AIアップデート Timeline",
  ideas: "提案ネタ Ideas",
  docs: "Design Docs",
  sources: "Sources"
};

function setText(id, value) {
  const node = document.querySelector(id);
  if (node) node.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function list(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function chips(items = []) {
  return items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("");
}

function topItems(limit = 3) {
  return (state.result?.items || []).slice(0, limit);
}

function estimateCost(config, result) {
  if (!config || config.appMode !== "paid" || !config.costGuard.paidAiEnabled) return "¥0";
  const count = result?.counts?.analyzed || 0;
  return count ? "API従量課金" : "paid ready";
}

function renderConfig(config) {
  setText("#mode", config.appMode);
  setText("#provider", config.aiProvider);
  setText("#paidAi", String(config.costGuard.paidAiEnabled));
  setText("#cost", estimateCost(config, state.result));
}

function showNotice(kind, message) {
  noticeEl.className = `notice ${kind}`;
  noticeEl.textContent = message;
}

function hideNotice() {
  noticeEl.className = "notice hidden";
  noticeEl.textContent = "";
}

function renderLoading() {
  contentEl.innerHTML = `
    <div class="state-card">
      <span class="loader"></span>
      <strong>Briefを更新しています</strong>
      <p>Mockデータを提案・PoC・設計書の観点に変換中です。</p>
    </div>
  `;
}

function renderError(error) {
  contentEl.innerHTML = `
    <div class="state-card error-state">
      <strong>APIの取得に失敗しました</strong>
      <p>${escapeHtml(error.message || "時間を置いて再実行してください。Mock fallbackでの再実行もできます。")}</p>
      <button class="secondary-button" type="button" data-action="retry">再実行</button>
    </div>
  `;
}

function renderEmpty() {
  contentEl.innerHTML = `
    <div class="state-card">
      <strong>まだBriefがありません</strong>
      <p>更新ボタンでMockのAI Opportunity Briefを生成できます。</p>
      <button class="secondary-button" type="button" data-action="retry">Mock Briefを生成</button>
    </div>
  `;
}

function renderToday() {
  const items = state.result.items;
  const top = topItems(3);
  const primary = top[0];
  const docs = state.result.designDocCandidates;
  const possible = [...new Set(top.flatMap((item) => item.whatBecamePossible).slice(0, 5))];
  const ideas = [...new Set(items.flatMap((item) => item.pocIdeas).slice(0, 5))];

  return `
    <section class="brief-hero">
      <div>
        <span class="pill">今日の結論</span>
        <h3>${escapeHtml(primary?.whatBecamePossible?.[0] || "AI情報を提案資産として整理できます")}</h3>
        <p>${escapeHtml(primary?.salesTalk || "重要なAIアップデートを、業務提案・PoC・設計書へ変換しました。")}</p>
      </div>
      <div class="brief-score">
        <span>${top.filter((item) => item.rank === "S").length}</span>
        <strong>S Rank</strong>
        <small>設計書化候補</small>
      </div>
    </section>

    <section class="metric-strip" aria-label="summary">
      <article><strong>${state.result.counts.collected}</strong><span>収集</span></article>
      <article><strong>${state.result.counts.analyzed}</strong><span>解析</span></article>
      <article><strong>${state.result.counts.designDocCandidates}</strong><span>設計書候補</span></article>
      <article><strong>${state.result.counts.fallbackUsed}</strong><span>Fallback</span></article>
    </section>

    <div class="two-column">
      <section class="block">
        <div class="block-heading">
          <h3>重要アップデート TOP3</h3>
          <span>Signal over noise</span>
        </div>
        <div class="stack">${top.map(renderOpportunityCard).join("")}</div>
      </section>

      <aside class="block side-brief">
        <div class="block-heading">
          <h3>今日できるようになったこと</h3>
        </div>
        <ul class="check-list">${list(possible)}</ul>

        <div class="block-heading compact">
          <h3>今日生成された提案ネタ</h3>
        </div>
        <ul class="plain-list">${list(ideas)}</ul>

        <div class="block-heading compact">
          <h3>次アクション</h3>
        </div>
        <ol class="action-list">
          <li>Sランクを1件選び、提案先企業を3社に絞る</li>
          <li>Design DocsでPoC設計の骨子を確認する</li>
          <li>社内共有文をSlack/Notion用に整える</li>
        </ol>
      </aside>
    </div>

    <section class="block">
      <div class="block-heading">
        <h3>今日生成された設計書</h3>
        <button class="text-button" type="button" data-view-link="docs">Design Docsへ</button>
      </div>
      <div class="doc-grid">${docs.map(renderDocCard).join("")}</div>
    </section>
  `;
}

function renderOpportunityCard(item) {
  return `
    <article class="opportunity-card ${item.rank === "S" ? "rank-s" : ""}">
      <div class="card-top">
        <span class="rank-badge">${escapeHtml(item.rank)}</span>
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p class="meta">${escapeHtml(item.sourceName)} / ${escapeHtml(item.sourceKind)} / ${escapeHtml(item.providerUsed)}${item.fallbackUsed ? " / fallback" : ""}</p>
        </div>
      </div>
      <div class="highlight">
        <span>できるようになったこと</span>
        <strong>${escapeHtml(item.whatBecamePossible[0])}</strong>
      </div>
      <p>${escapeHtml(item.whatUpdated)}</p>
      <div class="chip-row">${chips(item.targetCompanies.slice(0, 4))}</div>
    </article>
  `;
}

function renderTimeline() {
  return `
    <section class="block">
      <div class="block-heading">
        <h3>Timeline</h3>
        <span>${state.result.items.length} updates</span>
      </div>
      <div class="timeline">
        ${state.result.items
          .map(
            (item) => `
              <article class="timeline-item">
                <time>${new Date(item.publishedAt).toLocaleDateString("ja-JP")}</time>
                <div>
                  <span class="rank-badge small">${escapeHtml(item.rank)}</span>
                  <h4>${escapeHtml(item.title)}</h4>
                  <p>${escapeHtml(item.whatBecamePossible[0])}</p>
                  <div class="chip-row">${chips(item.signals)}</div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderIdeas() {
  return `
    <section class="block">
      <div class="block-heading">
        <h3>提案ネタ Ideas</h3>
        <span>PoC / 営業 / 事業開発</span>
      </div>
      <div class="idea-grid">
        ${state.result.items
          .map(
            (item) => `
              <article class="idea-card">
                <span class="rank-badge small">${escapeHtml(item.rank)}</span>
                <h4>${escapeHtml(item.businessUseCases[0])}</h4>
                <p>${escapeHtml(item.salesTalk)}</p>
                <div class="idea-section">
                  <strong>PoC案</strong>
                  <ul>${list(item.pocIdeas.slice(0, 2))}</ul>
                </div>
                <div class="idea-section">
                  <strong>提案先</strong>
                  <div class="chip-row">${chips(item.targetCompanies.slice(0, 4))}</div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDocCard(doc) {
  return `
    <article class="doc-card">
      <h4>${escapeHtml(doc.title)}</h4>
      <ol>${list(doc.sections.slice(0, 6))}</ol>
    </article>
  `;
}

function renderDocs() {
  return `
    <section class="block">
      <div class="block-heading">
        <h3>Design Docs</h3>
        <span>${state.result.designDocCandidates.length} candidates</span>
      </div>
      <div class="doc-grid">${state.result.designDocCandidates.map(renderDocCard).join("")}</div>
    </section>
  `;
}

function renderSources() {
  return `
    <section class="block">
      <div class="block-heading">
        <h3>Sources</h3>
        <span>Mock collection</span>
      </div>
      <div class="source-list">
        ${state.result.items
          .map(
            (item) => `
              <article class="source-card">
                <div>
                  <h4>${escapeHtml(item.sourceName)}</h4>
                  <p>${escapeHtml(item.title)}</p>
                </div>
                <div class="source-meta">
                  <span>${escapeHtml(item.sourceKind)}</span>
                  <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Source</a>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderActiveView() {
  document.querySelector("#viewTitle").textContent = viewTitles[state.activeView];
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === state.activeView));

  if (state.loading) {
    renderLoading();
    return;
  }
  if (state.error) {
    renderError(state.error);
    return;
  }
  if (!state.result?.items?.length) {
    renderEmpty();
    return;
  }

  const views = {
    today: renderToday,
    timeline: renderTimeline,
    ideas: renderIdeas,
    docs: renderDocs,
    sources: renderSources
  };
  contentEl.innerHTML = views[state.activeView]();
}

async function loadConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("設定の取得に失敗しました");
  state.config = await response.json();
  renderConfig(state.config);
}

async function runPipeline() {
  state.loading = true;
  state.error = null;
  hideNotice();
  renderActiveView();
  runButton.disabled = true;
  runButton.textContent = "更新中";

  try {
    const response = await fetch("/api/run", { method: "POST" });
    if (!response.ok) {
      if (response.status === 429) throw new Error("無料枠の上限に達しました。Mock fallbackで再実行してください。");
      throw new Error("Brief生成APIが失敗しました");
    }
    state.result = await response.json();
    setText("#timestamp", new Date(state.result.finishedAt).toLocaleString("ja-JP"));
    renderConfig(state.config);

    if (state.result.counts.fallbackUsed > 0) {
      showNotice("warning", "一部のAI解析は無料枠またはAPIエラーのためMock fallbackで生成しました。");
    }
  } catch (error) {
    state.error = error;
    showNotice("error", error.message);
  } finally {
    state.loading = false;
    runButton.disabled = false;
    runButton.textContent = "更新";
    renderActiveView();
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    state.activeView = item.dataset.view;
    renderActiveView();
  });
});

contentEl.addEventListener("click", (event) => {
  const retry = event.target.closest("[data-action='retry']");
  const viewLink = event.target.closest("[data-view-link]");
  if (retry) runPipeline();
  if (viewLink) {
    state.activeView = viewLink.dataset.viewLink;
    renderActiveView();
  }
});

try {
  await loadConfig();
  await runPipeline();
} catch (error) {
  state.loading = false;
  state.error = error;
  renderActiveView();
}
