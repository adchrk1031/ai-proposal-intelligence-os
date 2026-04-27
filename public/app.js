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
  today: "AI Proposal Intelligence OS",
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

function itemTitle(item) {
  return item.titleJa || item.title;
}

function itemSubtitle(item) {
  return item.titleJa ? item.title : item.sourceName;
}

function whatHappened(item) {
  return item.whatHappenedJa || item.whatUpdated;
}

function proposalTitle(item) {
  return item.proposalTitle || item.pocIdeas?.[0] || item.businessUseCases?.[0] || "AI活用PoC";
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
  setText(
    "#todayDate",
    new Date().toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    })
  );
  setText("#mode", config.appMode);
  setText("#modeTop", config.appMode);
  setText("#provider", config.aiProvider);
  setText("#paidAi", String(config.costGuard.paidAiEnabled));
  const cost = estimateCost(config, state.result);
  setText("#cost", cost);
  setText("#costTop", cost);
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
      <p>外部ソース入口を確認し、取得できない場合はMock fallbackで生成します。</p>
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
  const possible = [...new Set(top.flatMap((item) => item.whatBecamePossible).slice(0, 4))];
  const ideas = items.slice(0, 3);
  const focusAreas = [...new Set(top.map((item) => item.focusArea || item.signals?.[0]).filter(Boolean))].slice(0, 3);

  return `
    <section class="morning-brief">
      <span class="pill">今日の結論</span>
      <h3>今日は${escapeHtml(focusAreas.join("・") || "AI活用")}の更新が重要です。</h3>
      <p>${escapeHtml(primary?.salesTalk || "重要なAIアップデートを、業務提案・PoC・設計書へ変換しました。")}</p>
      <div class="brief-inline">
        <span><strong>注目領域</strong>${escapeHtml(focusAreas.join(" / ") || "AI提案")}</span>
        <span><strong>おすすめアクション</strong>${escapeHtml(primary?.nextAction || "Sランクの設計書候補を1件確認する")}</span>
      </div>
    </section>

    <div class="today-layout">
      <section class="block">
        <div class="block-heading">
          <h3>重要アップデート TOP3</h3>
          <span>5秒で判断</span>
        </div>
        <div class="stack">${top.map(renderOpportunityCard).join("")}</div>
      </section>

      <div class="side-stack">
        <section class="block compact-block">
          <div class="block-heading">
            <h3>今日見るべき設計書</h3>
            <button class="text-button" type="button" data-view-link="docs">一覧へ</button>
          </div>
          <div class="mini-doc-list">${docs.slice(0, 2).map(renderMiniDocCard).join("")}</div>
        </section>

        <section class="block compact-block">
          <div class="block-heading">
            <h3>今日できるようになったこと</h3>
          </div>
          <ul class="check-list short">${list(possible)}</ul>
        </section>

        <section class="block compact-block">
          <div class="block-heading">
            <h3>次アクション</h3>
          </div>
          <ol class="action-list">
            <li>設計書候補を1件開く</li>
            <li>提案先企業を3社に絞る</li>
            <li>Slack共有文へ整える</li>
          </ol>
        </section>
      </div>
    </div>

    <section class="block">
      <div class="block-heading">
        <h3>今日の提案ネタ</h3>
        <button class="text-button" type="button" data-view-link="ideas">Ideasへ</button>
      </div>
      <div class="brief-idea-grid">${ideas.map(renderBriefIdeaCard).join("")}</div>
    </section>
  `;
}

function renderOpportunityCard(item) {
  return `
    <article class="opportunity-card ${item.rank === "S" ? "rank-s" : ""}">
      <div class="card-top">
        <span class="rank-badge">${escapeHtml(item.rank)}重要</span>
        <div>
          <h4>${escapeHtml(itemTitle(item))}</h4>
          <p class="meta">${escapeHtml(itemSubtitle(item))}</p>
        </div>
      </div>
      <p class="event-line"><strong>何が起きたか:</strong> ${escapeHtml(whatHappened(item))}</p>
      <div class="highlight">
        <span>何ができるようになったか</span>
        <strong>${escapeHtml(item.whatBecamePossible[0])}</strong>
      </div>
      <div class="chip-row">${chips(item.businessUseCases.slice(0, 3))}</div>
      <p class="one-line"><strong>提案ネタ:</strong> ${escapeHtml(proposalTitle(item))}</p>
      <p class="one-line"><strong>次アクション:</strong> ${escapeHtml(item.nextAction || item.pocIdeas[0])}</p>
    </article>
  `;
}

function renderBriefIdeaCard(item) {
  return `
    <article class="brief-idea-card">
      <h4>${escapeHtml(proposalTitle(item))}</h4>
      <p><strong>対象会社:</strong> ${escapeHtml(item.targetCompanies[0])}</p>
      <p><strong>解決課題:</strong> ${escapeHtml(item.problemToSolve || item.businessUseCases[0])}</p>
      <p>${escapeHtml(item.salesTalk)}</p>
    </article>
  `;
}

function renderMiniDocCard(doc) {
  const item = state.result.items.find((candidate) => candidate.id === doc.itemId);
  const title = item ? `${item.focusArea || itemTitle(item)} PoC設計書` : doc.title;
  const tools = item?.requiredTools || ["業務データ", "評価指標"];
  return `
    <article class="mini-doc-card">
      <h4>${escapeHtml(title)}</h4>
      <p><strong>PoC難易度:</strong> ${escapeHtml(item?.pocDifficulty || "中")}</p>
      <p><strong>必要ツール:</strong> ${escapeHtml(tools.slice(0, 3).join(" / "))}</p>
      <div class="mini-actions">
        <button class="secondary-button small-button" type="button" data-view-link="docs">開く</button>
        <button class="secondary-button small-button" type="button" data-copy="${escapeHtml(title)}">コピー</button>
      </div>
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
                  <h4>${escapeHtml(itemTitle(item))}</h4>
                  <p class="meta">${escapeHtml(itemSubtitle(item))}</p>
                  <p>${escapeHtml(item.whatBecamePossible[0])}</p>
                  <div class="chip-row">${chips(item.signals.slice(0, 5))}</div>
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
                <h4>${escapeHtml(proposalTitle(item))}</h4>
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
  const item = state.result.items.find((candidate) => candidate.id === doc.itemId);
  const title = item ? `${item.focusArea || itemTitle(item)} PoC設計書` : doc.title;
  return `
    <article class="doc-card">
      <h4>${escapeHtml(title)}</h4>
      <p class="meta">難易度: ${escapeHtml(item?.pocDifficulty || "中")} / 必要ツール: ${escapeHtml((item?.requiredTools || ["業務データ"]).slice(0, 3).join(" / "))}</p>
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
  const reports = state.result.collection?.sourceReports || [];
  const usedFallback = state.result.collection?.usedMockFallback;
  return `
    <section class="block">
      <div class="block-heading">
        <h3>Sources</h3>
        <span>${reports.length} checked / ${usedFallback ? "Mock fallback" : "Live entry"}</span>
      </div>
      <div class="source-status-grid">
        ${reports
          .map(
            (source) => `
              <article class="source-status ${source.status}">
                <div>
                  <span class="status-dot"></span>
                  <strong>${escapeHtml(source.sourceName)}</strong>
                </div>
                <p>${escapeHtml(source.sourceType)} / ${escapeHtml(source.status)} / ${source.itemCount} items</p>
                ${source.error ? `<p class="source-error">${escapeHtml(source.error)}</p>` : ""}
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="block">
      <div class="block-heading">
        <h3>Collected Signals</h3>
        <span>${state.result.items.length} normalized</span>
      </div>
      <div class="source-list">
        ${state.result.items
          .map(
            (item) => `
              <article class="source-card">
                <div>
                  <h4>${escapeHtml(item.sourceName)}</h4>
                  <p>${escapeHtml(itemTitle(item))}</p>
                  <p class="meta">${escapeHtml(itemSubtitle(item))}</p>
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
  runButton.textContent = "Running";

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
    runButton.textContent = "Run Intelligence";
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
  const copyButton = event.target.closest("[data-copy]");
  if (retry) runPipeline();
  if (viewLink) {
    state.activeView = viewLink.dataset.viewLink;
    renderActiveView();
  }
  if (copyButton) {
    navigator.clipboard?.writeText(copyButton.dataset.copy);
    showNotice("success", "設計書タイトルをコピーしました。");
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
