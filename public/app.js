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

function shortDate(dateLike = new Date()) {
  return new Date(dateLike).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

function shortTime(dateLike) {
  if (!dateLike) return "not yet";
  return new Date(dateLike).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function sourceCostType(source) {
  return source.sourceType === "mock" ? "free/mock" : "free/public";
}

function sourceNote(source) {
  if (source.status === "error") return "取得に失敗。Mock fallbackまたは次回実行で再確認します。";
  if (source.status === "mock") return "外部通信なしで表示確認するための安全なMockデータです。";
  if (source.status === "fallback") return "外部取得が0件または失敗したためMockへ戻しました。";
  return "公開ソースから取得し、OpportunitySignal形式へ正規化しました。";
}

function industryFor(item) {
  return item.targetCompanies?.[0] || "AI活用を検討する企業";
}

function departmentFor(item) {
  if ((item.focusArea || "").includes("開発")) return "開発部門";
  if ((item.focusArea || "").includes("長文")) return "情報システム / 管理部門";
  if ((item.focusArea || "").includes("エージェント")) return "営業 / CS / 情シス";
  return "事業開発 / DX推進";
}

function impactFor(item) {
  if (item.rank === "S") return "高: 横展開しやすい提案テーマ";
  if (item.rank === "A") return "中: 部門PoCに向く";
  return "検証向き";
}

function docTitle(doc) {
  const item = state.result.items.find((candidate) => candidate.id === doc.itemId);
  return item ? `${item.focusArea || itemTitle(item)} PoC設計書` : doc.title;
}

function buildDailyBriefText() {
  const top = topItems(3);
  const themes = [...new Set(top.map((item) => item.focusArea || item.signals?.[0]).filter(Boolean))].slice(0, 3);
  return [
    `# AI Opportunity Brief - ${shortDate()}`,
    "",
    `## 今日の結論`,
    `今日は${themes.join("・") || "AI活用"}の更新が重要です。${top[0]?.salesTalk || ""}`,
    "",
    `## 重要アップデート TOP3`,
    ...top.map((item, index) => `${index + 1}. ${itemTitle(item)}\n   - できること: ${item.whatBecamePossible?.[0] || ""}\n   - 提案ネタ: ${proposalTitle(item)}`)
  ].join("\n");
}

function buildDesignDocText(doc) {
  const item = state.result.items.find((candidate) => candidate.id === doc.itemId);
  return [
    `# ${docTitle(doc)}`,
    "",
    `- 元ネタ: ${item ? itemTitle(item) : doc.title}`,
    `- 対象業務: ${item?.businessUseCases?.[0] || "業務改善"}`,
    `- PoC範囲: ${item?.pocIdeas?.[0] || "小規模PoC"}`,
    `- 必要ツール: ${(item?.requiredTools || ["業務データ"]).join(" / ")}`,
    `- 次アクション: ${item?.nextAction || "PoC要件を整理する"}`,
    "",
    `## セクション`,
    ...(doc.sections || []).map((section) => `- ${section}`)
  ].join("\n");
}

function renderConfig(config) {
  setText(
    "#todayDate",
    shortDate()
  );
  setText("#mode", config.appMode);
  setText("#modeTop", config.appMode);
  setText("#provider", config.aiProvider);
  setText("#paidAi", String(config.costGuard.paidAiEnabled));
  const cost = estimateCost(config, state.result);
  setText("#cost", cost);
  setText("#costTop", cost);
  setText("#lastRunSide", shortTime(state.result?.finishedAt));
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
  const possible = [...new Set(top.flatMap((item) => item.whatBecamePossible).slice(0, 5))];
  const ideas = items.slice(0, 3);
  const focusAreas = [...new Set(top.map((item) => item.focusArea || item.signals?.[0]).filter(Boolean))].slice(0, 3);

  return `
    <section class="today-date-row">
      <span>${escapeHtml(shortDate(state.result.finishedAt))}</span>
      <button class="text-button" type="button" data-copy-daily="true">Daily Briefをコピー</button>
    </section>

    <section class="morning-brief">
      <div class="brief-headline">
        <span class="pill">今日の結論</span>
        <h3>今日は${escapeHtml(focusAreas.join("・") || "AI活用")}を提案化する日です。</h3>
        <p>${escapeHtml(primary?.salesTalk || "重要なAIアップデートを、業務提案・PoC・設計書へ変換しました。")}</p>
      </div>
      <div class="brief-inline">
        <span><strong>注目テーマ</strong>${escapeHtml(focusAreas.join(" / ") || "AI提案")}</span>
        <span><strong>事業活用</strong>${escapeHtml(primary?.businessDevelopmentAngles?.[0] || "小さなPoCから横展開する")}</span>
        <span><strong>今日やること</strong>${escapeHtml(primary?.nextAction || "Sランクの設計書候補を1件確認する")}</span>
      </div>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <h3>重要アップデート TOP3</h3>
        <span>Signal over noise</span>
      </div>
      <div class="stack">${top.map(renderOpportunityCard).join("")}</div>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <h3>今日できるようになったこと</h3>
      </div>
      <ul class="capability-list">${possible.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <h3>今日の提案ネタ</h3>
        <button class="text-button" type="button" data-view-link="ideas">Ideasへ</button>
      </div>
      <div class="brief-idea-grid">${ideas.map(renderBriefIdeaCard).join("")}</div>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <h3>今日見るべき設計書</h3>
        <button class="text-button" type="button" data-view-link="docs">Design Docsへ</button>
      </div>
      <div class="mini-doc-list">${docs.slice(0, 3).map(renderMiniDocCard).join("")}</div>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <h3>次アクション</h3>
      </div>
      <ol class="next-action-list">
        <li>Design Docを1件コピーし、PoC前提を確認する</li>
        <li>提案トークを1つ選び、対象会社を3社に絞る</li>
        <li>Daily Briefをチーム共有用に貼り付ける</li>
      </ol>
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
      <div class="card-actions">
        <button class="text-button" type="button" data-copy="${escapeHtml(item.salesTalk)}">提案トークをコピー</button>
        <button class="text-button" type="button" data-copy="${escapeHtml(item.socialPost)}">SNS投稿案をコピー</button>
      </div>
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
      <button class="text-button inline-copy" type="button" data-copy="${escapeHtml(item.salesTalk)}">提案トークをコピー</button>
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
        <button class="secondary-button small-button" type="button" data-copy="${escapeHtml(buildDesignDocText(doc))}">コピー</button>
      </div>
    </article>
  `;
}

function renderTimeline() {
  const top = topItems(3);
  const conclusion = top[0]?.whatBecamePossible?.[0] || "AI情報を提案資産に変換しました";
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>Timeline</h3>
        <span>日次Brief履歴</span>
      </div>
      <div class="timeline-day-list">
        <article class="timeline-day-card">
          <div>
            <time>${escapeHtml(shortDate(state.result.finishedAt))}</time>
            <h4>${escapeHtml(conclusion)}</h4>
            <p>今日の重要アップデートを、提案ネタと設計書候補へ整理しました。</p>
          </div>
          <div class="timeline-metrics">
            <span><strong>${state.result.items.length}</strong>重要アップデート件数</span>
            <span><strong>${state.result.items.slice(0, 3).length}</strong>生成Ideas数</span>
            <span><strong>${state.result.designDocCandidates.length}</strong>生成Design Docs数</span>
            <span><strong>${escapeHtml(estimateCost(state.config, state.result))}</strong>推定コスト</span>
          </div>
          <button class="secondary-button small-button" type="button" data-view-link="today">開く</button>
        </article>
      </div>
    </section>
  `;
}

function renderIdeas() {
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>提案ネタ Ideas</h3>
        <span>${state.result.items.length} cards</span>
      </div>
      <div class="idea-grid">
        ${state.result.items
          .map(
            (item) => `
              <article class="idea-card">
                <span class="rank-badge small">${escapeHtml(item.rank)}</span>
                <h4>${escapeHtml(proposalTitle(item))}</h4>
                <div class="idea-fields">
                  <p><strong>対象業界</strong>${escapeHtml(industryFor(item))}</p>
                  <p><strong>対象部署</strong>${escapeHtml(departmentFor(item))}</p>
                  <p><strong>解決課題</strong>${escapeHtml(item.problemToSolve || item.businessUseCases[0])}</p>
                  <p><strong>PoC難易度</strong>${escapeHtml(item.pocDifficulty || "中")}</p>
                  <p><strong>事業インパクト</strong>${escapeHtml(impactFor(item))}</p>
                  <p><strong>関連設計書</strong>${escapeHtml(item.focusArea || itemTitle(item))} PoC設計書</p>
                </div>
                <p class="talk-preview">${escapeHtml(item.salesTalk)}</p>
                <button class="text-button inline-copy" type="button" data-copy="${escapeHtml(item.salesTalk)}">提案トークをコピー</button>
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
  return `
    <article class="doc-card">
      <h4>${escapeHtml(docTitle(doc))}</h4>
      <div class="doc-fields">
        <p><strong>元ネタ</strong>${escapeHtml(item ? itemTitle(item) : doc.title)}</p>
        <p><strong>対象業務</strong>${escapeHtml(item?.businessUseCases?.[0] || "業務改善")}</p>
        <p><strong>PoC範囲</strong>${escapeHtml(item?.pocIdeas?.[0] || "小規模PoC")}</p>
        <p><strong>必要ツール</strong>${escapeHtml((item?.requiredTools || ["業務データ"]).slice(0, 3).join(" / "))}</p>
        <p><strong>次アクション</strong>${escapeHtml(item?.nextAction || "要件を整理する")}</p>
      </div>
      <button class="secondary-button small-button" type="button" data-copy="${escapeHtml(buildDesignDocText(doc))}">Markdownコピー</button>
    </article>
  `;
}

function renderDocs() {
  return `
    <section class="brief-section">
      <div class="section-kicker">
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
  const okCount = reports.filter((source) => source.status === "ok").length;
  const errorCount = reports.filter((source) => source.status === "error").length;
  const mockCount = reports.filter((source) => source.status === "mock" || source.status === "fallback").length;
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>Sources</h3>
        <span>${reports.length} checked / ${usedFallback ? "Mock fallback" : "Live entry"}</span>
      </div>
      <div class="source-summary-grid">
        <article><strong>${reports.length}</strong><span>有効ソース数</span></article>
        <article><strong>${okCount}</strong><span>成功ソース数</span></article>
        <article><strong>${errorCount}</strong><span>エラーソース数</span></article>
        <article><strong>${mockCount}</strong><span>Mock fallback数</span></article>
        <article><strong>${escapeHtml(estimateCost(state.config, state.result))}</strong><span>推定コスト</span></article>
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
                <p><strong>種別</strong>${escapeHtml(source.sourceType)}</p>
                <p><strong>status</strong>${escapeHtml(source.status)} / ${source.itemCount} items</p>
                <p><strong>costType</strong>${escapeHtml(sourceCostType(source))}</p>
                <p><strong>lastCollectedAt</strong>${escapeHtml(shortTime(source.checkedAt))}</p>
                <p><strong>notesJa</strong>${escapeHtml(sourceNote(source))}</p>
                ${source.error ? `<p class="source-error">${escapeHtml(source.error)}</p>` : ""}
              </article>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="brief-section">
      <div class="section-kicker">
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
  const dailyCopy = event.target.closest("[data-copy-daily]");
  if (retry) runPipeline();
  if (viewLink) {
    state.activeView = viewLink.dataset.viewLink;
    renderActiveView();
  }
  if (copyButton) {
    navigator.clipboard?.writeText(copyButton.dataset.copy);
    showNotice("success", "コピーしました。");
  }
  if (dailyCopy) {
    navigator.clipboard?.writeText(buildDailyBriefText());
    showNotice("success", "Daily Briefをコピーしました。");
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
