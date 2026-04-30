const runButton = document.querySelector("#runButton");
const contentEl = document.querySelector("#content");
const noticeEl = document.querySelector("#notice");
const navItems = [...document.querySelectorAll(".nav-item")];

const STORAGE_KEYS = {
  briefHistory: "ai-proposal-os-brief-history",
  actionHistory: "ai-proposal-os-action-history"
};

const PRIORITY_RULES = [
  { id: "rank-s", label: "S", test: (item) => item.rank === "S", points: 52 },
  { id: "rank-a", label: "A", test: (item) => item.rank === "A", points: 38 },
  { id: "design-doc", label: "設計書候補", test: (_item, context) => context.designDocIds.has(_item.id), points: 20 },
  { id: "poc", label: "PoC候補", test: (item) => Boolean(item.pocIdeas?.length), points: 18 },
  {
    id: "internal-ready",
    label: "社内活用しやすい",
    test: (item) => (item.businessUseCases?.length || 0) >= 2 || (item.targetCompanies?.length || 0) >= 2,
    points: 14
  },
  { id: "quick-win", label: "3日以内に試せる", test: (item) => isQuickWin(item), points: 14 },
  { id: "sales-ready", label: "営業提案に使える", test: (item) => isSalesReady(item), points: 8 },
  { id: "fresh", label: "新着", test: (item) => recencyPoints(item) >= 6, points: 6 }
];

const ACTION_LABELS = {
  slack: "Slack共有済み",
  notion: "Notion保存済み",
  poc: "PoC化済み",
  doc: "設計書候補化済み",
  social: "SNS投稿化済み"
};

const state = {
  activeView: "today",
  activeFilter: "all",
  config: null,
  result: null,
  loading: true,
  error: null,
  rankedItems: [],
  priorityMap: new Map(),
  briefHistory: readJsonStorage(STORAGE_KEYS.briefHistory, []),
  actionHistory: readJsonStorage(STORAGE_KEYS.actionHistory, {})
};

const viewTitles = {
  today: "今日のAI提案ネタ",
  timeline: "Brief Timeline",
  ideas: "提案ネタ",
  docs: "設計書候補",
  sources: "収集状況"
};

const filterDefs = [
  { id: "all", label: "すべて" },
  { id: "important", label: "重要" },
  { id: "news", label: "ニュース" },
  { id: "paper", label: "論文" },
  { id: "oss", label: "OSS" },
  { id: "sns", label: "SNS" },
  { id: "poc", label: "PoC候補" }
];

function readJsonStorage(key, fallback) {
  try {
    if (!window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors in preview mode
  }
}

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

function itemTitle(item) {
  return item.titleJa || item.title;
}

function itemSubtitle(item) {
  return item.titleJa ? item.title : item.sourceName;
}

function whatHappened(item) {
  return item.whatHappenedJa || item.whatUpdated || item.summary || "";
}

function proposalTitle(item) {
  return item.proposalTitle || item.pocIdeas?.[0] || item.businessUseCases?.[0] || "AI活用PoC";
}

function capabilityTitle(item) {
  return item.capabilityTitle || item.whatBecamePossible?.[0] || itemTitle(item);
}

function shortDescription(item) {
  return item.shortDescription || whatHappened(item) || "";
}

function expectedEffect(item) {
  return item.expectedEffect || item.businessDevelopmentAngles?.[0] || "小さく試して横展開しやすいテーマです。";
}

function shortTalk(item) {
  const text = item.salesTalkShort || item.salesTalk || proposalTitle(item);
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function socialCopy(item) {
  const text = item.socialPostShort || item.socialPost || `${capabilityTitle(item)}。${shortDescription(item)}`;
  return text.length > 110 ? `${text.slice(0, 110)}...` : text;
}

function departmentAndUse(item) {
  const departments = item.targetCompanies?.slice(0, 2).join(" / ") || "社内DXチーム";
  const useCases = item.businessUseCases?.slice(0, 2).join(" / ") || "業務改善";
  return `${departments}で ${useCases}`;
}

function sourceKindLabel(itemOrSource) {
  const kind = itemOrSource.sourceKind || itemOrSource.sourceType;
  if (kind === "paper") return "論文";
  if (kind === "github" || kind === "github_trending") return "OSS";
  if (kind === "social" || kind === "sns") return "SNS";
  if (kind === "official" || kind === "tech_blog" || kind === "news") return "ニュース";
  return "ニュース";
}

function sourceStatusLabel(status) {
  if (status === "ok" || status === "mock") return "success";
  if (status === "error") return "failed";
  if (status === "fallback") return "skipped";
  return status;
}

function sourceCostType(source) {
  return source.sourceType === "mock" ? "Mock表示" : "無料/公開";
}

function sourceNote(source) {
  if (source.status === "error") return "取得に失敗。Mock表示で続行しています。";
  if (source.status === "mock") return "外部通信なしで画面確認するための安全なMockデータです。";
  if (source.status === "fallback") return "公開ソースが空のためMock表示に切り替えました。";
  return "公開ソースから取得できています。";
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

function priorityLabel(rank) {
  if (rank === "S") return "最優先";
  if (rank === "A") return "重要";
  if (rank === "B") return "検証";
  return "参考";
}

function riskNote(item) {
  if (item.providerError) return `AI分析で一部fallbackが発生しています。${item.providerError}`;
  if (item.sourceType === "mock") return "Mockデータを含むため、実運用前に元情報の確認が必要です。";
  if (item.rank === "S") return "横展開しやすい反面、対象業務と評価指標を先に固定した方が進めやすいです。";
  return "まずは対象部署を1つに絞って小さく検証するのが安全です。";
}

function isQuickWin(item) {
  const nextAction = item.nextAction || "";
  return item.pocDifficulty === "低" || nextAction.length <= 18 || /選ぶ|決める|整理|作る/.test(nextAction);
}

function isSalesReady(item) {
  return Boolean(item.proposalTitle || item.salesTalkShort || item.salesTalk);
}

function recencyPoints(item) {
  if (!item.publishedAt) return 0;
  const publishedAt = new Date(item.publishedAt);
  const now = new Date();
  const diffDays = (now - publishedAt) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 8;
  if (diffDays <= 3) return 6;
  if (diffDays <= 7) return 4;
  if (diffDays <= 14) return 2;
  return 0;
}

function itemFocusKey(item) {
  return item.focusArea || item.businessUseCases?.[0] || sourceKindLabel(item);
}

function buildPriorityContext(result) {
  return {
    designDocIds: new Set((result.designDocCandidates || []).map((doc) => doc.itemId))
  };
}

function scoreBriefItem(item, context) {
  let score = 0;
  const reasons = [];

  for (const rule of PRIORITY_RULES) {
    if (rule.test(item, context)) {
      score += rule.points;
      reasons.push(rule.label);
    }
  }

  score += recencyPoints(item);
  if ((item.requiredTools?.length || 0) <= 3) score += 4;
  if ((item.businessUseCases?.length || 0) >= 3) score += 4;
  if (item.sourceKind === "official") score += 4;

  return {
    score,
    reasons: reasons.slice(0, 4)
  };
}

function rankItemsForToday(result) {
  const context = buildPriorityContext(result);
  const scored = result.items.map((item) => {
    const priority = scoreBriefItem(item, context);
    return {
      ...item,
      priorityScore: priority.score,
      priorityReasons: priority.reasons
    };
  });

  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });

  const seenFocus = new Set();
  const ranked = [];
  const remaining = [...scored];

  while (remaining.length) {
    const freshFocusIndex = remaining.findIndex((item) => !seenFocus.has(itemFocusKey(item)));
    const index = freshFocusIndex >= 0 ? freshFocusIndex : 0;
    const [nextItem] = remaining.splice(index, 1);
    seenFocus.add(itemFocusKey(nextItem));
    ranked.push(nextItem);
  }

  return ranked;
}

function topItems(limit = 3) {
  return (state.rankedItems || []).slice(0, limit);
}

function summaryCounts(result) {
  const items = state.rankedItems.length ? state.rankedItems : result?.items || [];
  return {
    newItems: result?.counts?.collected || items.length,
    important: items.filter((item) => item.rank === "S" || item.rank === "A").length,
    poc: items.filter((item) => item.pocIdeas?.length).length,
    docs: result?.designDocCandidates?.length || 0
  };
}

function filterItems(items) {
  const ranked = items || state.rankedItems;
  if (state.activeFilter === "all") return ranked;
  if (state.activeFilter === "important") {
    return ranked.filter((item) => item.rank === "S" || item.rank === "A");
  }
  if (state.activeFilter === "paper") return ranked.filter((item) => sourceKindLabel(item) === "論文");
  if (state.activeFilter === "oss") return ranked.filter((item) => sourceKindLabel(item) === "OSS");
  if (state.activeFilter === "sns") {
    return ranked.filter((item) => sourceKindLabel(item) === "SNS" || item.signals?.some((signal) => /sns|social/i.test(signal)));
  }
  if (state.activeFilter === "poc") return ranked.filter((item) => item.pocIdeas?.length || item.pocDifficulty === "低");
  if (state.activeFilter === "news") return ranked.filter((item) => sourceKindLabel(item) === "ニュース");
  return ranked;
}

function buildDailyBriefText() {
  const top = topItems(3);
  return [
    `# AI Proposal Brief - ${shortDate()}`,
    "",
    "## 今日の要点",
    ...top.map(
      (item, index) =>
        `${index + 1}. ${capabilityTitle(item)}\n   - 上位理由: ${(item.priorityReasons || []).join(" / ")}\n   - 使えそうな部署: ${departmentAndUse(item)}\n   - 3日以内に試せること: ${item.nextAction || item.pocIdeas?.[0] || "PoC対象を1件選ぶ"}`
    )
  ].join("\n");
}

function buildProposalText(item) {
  return [
    `# ${proposalTitle(item)}`,
    "",
    `- 何が起きたか: ${whatHappened(item)}`,
    `- なぜ重要か: ${expectedEffect(item)}`,
    `- 上位理由: ${(item.priorityReasons || []).join(" / ")}`,
    `- 使えそうな部署・用途: ${departmentAndUse(item)}`,
    `- 3日以内に試せること: ${item.nextAction || item.pocIdeas?.[0] || "PoC対象を1つ決める"}`,
    `- 情報源: ${item.sourceName} / ${item.url}`
  ].join("\n");
}

function buildPocText(item) {
  return [
    `# ${proposalTitle(item)} PoC案`,
    "",
    `- 対象テーマ: ${capabilityTitle(item)}`,
    `- 対象業務: ${item.businessUseCases?.[0] || "業務改善"}`,
    `- 対象部署: ${item.targetCompanies?.[0] || "社内DXチーム"}`,
    `- PoC案: ${item.pocIdeas?.[0] || "小さな検証から開始"}`,
    `- 必要ツール: ${(item.requiredTools || ["業務データ"]).join(" / ")}`,
    `- 次の一手: ${item.nextAction || "要件を整理する"}`
  ].join("\n");
}

function buildSlackText(item) {
  return [
    `【今日のAI提案ネタ】${capabilityTitle(item)}`,
    `上位理由: ${(item.priorityReasons || []).join(" / ")}`,
    `何が起きたか: ${whatHappened(item)}`,
    `使えそうな部署・用途: ${departmentAndUse(item)}`,
    `3日以内に試せること: ${item.nextAction || item.pocIdeas?.[0] || "PoC対象を決める"}`
  ].join("\n");
}

function buildSocialText(item) {
  return [
    `${capabilityTitle(item)}`,
    `${shortDescription(item)}`,
    `提案OS視点では ${proposalTitle(item)} のようなPoCに落とし込みやすいテーマです。`
  ].join("\n");
}

function buildDesignDocText(doc) {
  const item = state.rankedItems.find((candidate) => candidate.id === doc.itemId);
  return [
    `# ${doc.title}`,
    "",
    `- 元ネタ: ${item ? itemTitle(item) : doc.title}`,
    `- 対象業務: ${item?.businessUseCases?.[0] || "業務改善"}`,
    `- PoC範囲: ${item?.pocIdeas?.[0] || "小規模PoC"}`,
    `- 必要ツール: ${(item?.requiredTools || ["業務データ"]).join(" / ")}`,
    `- 次アクション: ${item?.nextAction || "PoC要件を整理する"}`,
    "",
    "## セクション",
    ...(doc.sections || []).map((section) => `- ${section}`)
  ].join("\n");
}

function currentBriefDateKey() {
  const finishedAt = state.result?.finishedAt || new Date().toISOString();
  return new Date(finishedAt).toISOString().slice(0, 10);
}

function actionStorageKey(itemId) {
  return `${currentBriefDateKey()}::${itemId}`;
}

function getActionState(itemId) {
  return state.actionHistory[actionStorageKey(itemId)] || {};
}

function markActionState(itemId, action) {
  const key = actionStorageKey(itemId);
  const previous = state.actionHistory[key] || {};
  state.actionHistory[key] = {
    ...previous,
    [action]: true,
    updatedAt: new Date().toISOString()
  };
  writeJsonStorage(STORAGE_KEYS.actionHistory, state.actionHistory);
}

function actionStatusBadges(itemId) {
  const actions = getActionState(itemId);
  return Object.entries(ACTION_LABELS)
    .filter(([action]) => actions[action])
    .map(([, label]) => label);
}

function buildBriefSnapshot(result) {
  return {
    savedAt: new Date().toISOString(),
    finishedAt: result.finishedAt,
    itemIds: result.items.map((item) => item.id),
    counts: summaryCounts(result),
    sourceReports: (result.collection?.sourceReports || []).map((source) => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      status: source.status,
      itemCount: source.itemCount,
      checkedAt: source.checkedAt,
      error: source.error
    }))
  };
}

function persistBriefSnapshot(result) {
  const snapshot = buildBriefSnapshot(result);
  const finishedAt = snapshot.finishedAt;
  const nextHistory = [snapshot, ...state.briefHistory.filter((entry) => entry.finishedAt !== finishedAt)].slice(0, 30);
  state.briefHistory = nextHistory;
  writeJsonStorage(STORAGE_KEYS.briefHistory, nextHistory);
}

function previousSnapshot() {
  if (state.briefHistory.length < 2) return null;
  return state.briefHistory[1];
}

function updatedCountFromPrevious() {
  const prev = previousSnapshot();
  if (!prev) return 0;
  const currentIds = new Set((state.result?.items || []).map((item) => item.id));
  return prev.itemIds.filter((id) => currentIds.has(id)).length;
}

function buildSourceAnalytics() {
  const currentReports = state.result?.collection?.sourceReports || [];
  const history = state.briefHistory;

  return currentReports.map((source) => {
    const sourceHistory = history.flatMap((snapshot) => snapshot.sourceReports || []).filter((report) => report.sourceId === source.sourceId);
    const attempts = sourceHistory.length || 1;
    const successes = sourceHistory.filter((report) => report.status === "ok" || report.status === "mock").length;
    const lastError = sourceHistory.find((report) => report.error)?.error || source.error || "";
    const fallbackUsed = source.status === "fallback" || source.status === "mock";

    return {
      ...source,
      displayStatus: sourceStatusLabel(source.status),
      successRate: `${Math.round((successes / attempts) * 100)}%`,
      lastError,
      recentError: lastError || "なし",
      fallbackUsed
    };
  });
}

function actionSummaryCounts() {
  const todayKey = currentBriefDateKey();
  const values = Object.entries(state.actionHistory)
    .filter(([key]) => key.startsWith(todayKey))
    .map(([, value]) => value);

  return {
    proposalized: values.filter((entry) => entry.poc || entry.doc).length,
    slackShared: values.filter((entry) => entry.slack).length,
    notionSaved: values.filter((entry) => entry.notion).length
  };
}

function buildTimelineModel() {
  const history = state.briefHistory;
  const now = new Date(state.result?.finishedAt || Date.now());
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);

  const todayEntries = history.filter((entry) => (entry.finishedAt || "").slice(0, 10) === todayKey);
  const yesterdayEntries = history.filter((entry) => (entry.finishedAt || "").slice(0, 10) === yesterdayKey);
  const weekEntries = history.filter((entry) => new Date(entry.finishedAt) >= startOfWeek);
  const actionCounts = actionSummaryCounts();

  return {
    periods: [
      {
        label: "今日",
        count: todayEntries.length || 1,
        note: `${summaryCounts(state.result).newItems}件の新規ネタ`
      },
      {
        label: "昨日",
        count: yesterdayEntries.length,
        note: yesterdayEntries.length ? `${yesterdayEntries[0].counts?.important || 0}件の重要ネタ` : "まだ保存なし"
      },
      {
        label: "今週",
        count: weekEntries.length,
        note: `${weekEntries.reduce((sum, entry) => sum + (entry.counts?.docs || 0), 0)}件の設計書候補`
      }
    ],
    statuses: [
      { label: "保存済みBrief", value: history.length },
      { label: "新規ネタ", value: summaryCounts(state.result).newItems },
      { label: "更新されたネタ", value: updatedCountFromPrevious() },
      { label: "提案化済み", value: actionCounts.proposalized },
      { label: "Slack共有済み", value: actionCounts.slackShared },
      { label: "Notion保存済み", value: actionCounts.notionSaved }
    ]
  };
}

function hydrateRankedItems() {
  if (!state.result?.items?.length) {
    state.rankedItems = [];
    return;
  }
  state.rankedItems = rankItemsForToday(state.result);
  state.priorityMap = new Map(state.rankedItems.map((item) => [item.id, item]));
}

function renderConfig(config) {
  setText("#todayDate", shortDate());
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
      <strong>AI情報をBrief化しています</strong>
      <p>提案ネタ、PoC候補、設計書候補に整理しています。</p>
    </div>
  `;
}

function renderError(error) {
  contentEl.innerHTML = `
    <div class="state-card error-state">
      <strong>一部の取得に失敗しました</strong>
      <p>${escapeHtml(error.message || "一部の取得に失敗しました。Mock表示で続行しています。")}</p>
      <button class="secondary-button" type="button" data-action="retry">再実行</button>
    </div>
  `;
}

function renderEmpty() {
  contentEl.innerHTML = `
    <div class="state-card">
      <strong>まだBriefはありません</strong>
      <p>Runを押すと、今日のAI提案ネタをまとめて表示します。</p>
      <button class="secondary-button" type="button" data-action="retry">Run</button>
    </div>
  `;
}

function renderSummaryCard(label, value, note) {
  return `
    <article class="summary-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <p>${escapeHtml(note)}</p>
    </article>
  `;
}

function renderFilterBar() {
  return `
    <div class="filter-bar" role="tablist" aria-label="brief filters">
      ${filterDefs
        .map(
          (filter) => `
            <button class="filter-chip ${filter.id === state.activeFilter ? "active" : ""}" type="button" data-filter="${filter.id}">
              ${escapeHtml(filter.label)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPriorityReasons(item) {
  return `
    <div class="reason-row">
      ${(item.priorityReasons || [])
        .slice(0, 4)
        .map((reason) => `<span class="reason-pill">${escapeHtml(reason)}</span>`)
        .join("")}
    </div>
  `;
}

function renderDetailSections(item) {
  const doc = state.result.designDocCandidates.find((candidate) => candidate.itemId === item.id);
  const actionStatuses = actionStatusBadges(item.id);

  return `
    <div class="detail-layout">
      <div class="detail-grid">
        <div class="detail-block">
          <span>何が起きたか</span>
          <p>${escapeHtml(whatHappened(item))}</p>
        </div>
        <div class="detail-block">
          <span>なぜ重要か</span>
          <p>${escapeHtml(expectedEffect(item))}</p>
        </div>
        <div class="detail-block">
          <span>社内活用案</span>
          <p>${escapeHtml(item.businessUseCases?.join(" / ") || "業務改善テーマとして転用")}</p>
        </div>
        <div class="detail-block">
          <span>PoC案</span>
          <p>${escapeHtml(item.pocIdeas?.join(" / ") || "小さく試すPoCを作る")}</p>
        </div>
        <div class="detail-block">
          <span>設計書候補</span>
          <p>${escapeHtml(doc ? doc.title : "PoC設計書の雛形に展開できます")}</p>
        </div>
        <div class="detail-block">
          <span>営業・提案ネタ</span>
          <p>${escapeHtml(shortTalk(item))}</p>
        </div>
        <div class="detail-block">
          <span>SNS投稿ネタ</span>
          <p>${escapeHtml(socialCopy(item))}</p>
        </div>
        <div class="detail-block">
          <span>リスク・注意点</span>
          <p>${escapeHtml(riskNote(item))}</p>
        </div>
        <div class="detail-block">
          <span>元記事URL</span>
          <p><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">元記事を開く</a></p>
        </div>
      </div>
      <aside class="action-panel">
        <div class="action-panel-head">
          <strong>次のアクション</strong>
          <span>${escapeHtml(`${item.priorityScore}pt`)}</span>
        </div>
        <p>共有や提案化にそのまま進めます。</p>
        <div class="action-status-row">
          ${
            actionStatuses.length
              ? actionStatuses.map((label) => `<span class="status-tag">${escapeHtml(label)}</span>`).join("")
              : '<span class="status-tag muted">まだ操作していません</span>'
          }
        </div>
        <div class="action-stack">
          <button class="secondary-button small-button" type="button" data-ui-action="slack" data-item-id="${escapeHtml(item.id)}">Slack共有文にする</button>
          <button class="secondary-button small-button" type="button" data-ui-action="notion" data-item-id="${escapeHtml(item.id)}">Notion保存</button>
          <button class="secondary-button small-button" type="button" data-ui-action="poc" data-item-id="${escapeHtml(item.id)}">PoC案にする</button>
          <button class="secondary-button small-button" type="button" data-ui-action="doc" data-item-id="${escapeHtml(item.id)}">設計書候補にする</button>
          <button class="secondary-button small-button" type="button" data-ui-action="social" data-item-id="${escapeHtml(item.id)}">SNS投稿ネタにする</button>
          <button class="secondary-button small-button" type="button" data-ui-action="article" data-item-id="${escapeHtml(item.id)}">元記事を開く</button>
        </div>
      </aside>
    </div>
  `;
}

function renderBriefCard(item) {
  return `
    <article class="brief-card priority-${escapeHtml(item.rank.toLowerCase())}">
      <div class="brief-card-top">
        <div class="brief-title-wrap">
          <span class="rank-badge">${escapeHtml(item.rank)}</span>
          <span class="priority-label">${escapeHtml(priorityLabel(item.rank))}</span>
        </div>
        <span class="source-pill">${escapeHtml(sourceKindLabel(item))}</span>
      </div>
      <h4>${escapeHtml(capabilityTitle(item))}</h4>
      <p class="brief-summary">${escapeHtml(shortDescription(item))}</p>
      ${renderPriorityReasons(item)}
      <div class="brief-meta-grid">
        <div>
          <span>使えそうな部署・用途</span>
          <p>${escapeHtml(departmentAndUse(item))}</p>
        </div>
        <div>
          <span>3日以内に試せること</span>
          <p>${escapeHtml(item.nextAction || item.pocIdeas?.[0] || "PoC対象を1つ決める")}</p>
        </div>
        <div>
          <span>情報源</span>
          <p>${escapeHtml(`${item.sourceName} / ${itemSubtitle(item)}`)}</p>
        </div>
      </div>
      <details class="brief-details">
        <summary>詳細を見る</summary>
        ${renderDetailSections(item)}
      </details>
    </article>
  `;
}

function renderMiniDocCard(doc) {
  const item = state.priorityMap.get(doc.itemId);
  return `
    <article class="mini-doc-card">
      <h4>${escapeHtml(doc.title)}</h4>
      <p><strong>対象業務</strong>${escapeHtml(item?.businessUseCases?.[0] || "業務改善")}</p>
      <p><strong>必要ツール</strong>${escapeHtml((item?.requiredTools || ["業務データ"]).slice(0, 3).join(" / "))}</p>
      <p><strong>次の一手</strong>${escapeHtml(item?.nextAction || "PoC要件を整理する")}</p>
      <div class="mini-actions">
        <button class="secondary-button small-button" type="button" data-copy="${escapeHtml(buildDesignDocText(doc))}" data-copy-message="設計書候補をコピーしました">下書きをコピー</button>
        <button class="secondary-button small-button" type="button" data-view-link="docs">一覧で見る</button>
      </div>
    </article>
  `;
}

function renderLogPanel() {
  const analytics = buildSourceAnalytics().slice(0, 4);
  return `
    <section class="brief-section log-section">
      <div class="section-kicker">
        <h3>収集ログ</h3>
        <span>${escapeHtml(shortTime(state.result.finishedAt))} 更新</span>
      </div>
      <div class="log-list">
        ${analytics
          .map(
            (source) => `
              <article class="log-row ${escapeHtml(source.displayStatus)}">
                <div>
                  <strong>${escapeHtml(source.sourceName)}</strong>
                  <p>${escapeHtml(sourceNote(source))}</p>
                </div>
                <div class="log-metrics">
                  <span>${escapeHtml(source.displayStatus)}</span>
                  <span>${escapeHtml(`${source.itemCount}件`)}</span>
                  <span>${escapeHtml(source.successRate)}</span>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderToday() {
  const counts = summaryCounts(state.result);
  const filteredItems = filterItems();
  const lead = topItems(1)[0];

  return `
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Daily Brief</p>
        <h3>今日のAI提案ネタ</h3>
        <p class="hero-text">
          ${escapeHtml(
            lead
              ? `${capabilityTitle(lead)}を起点に、提案ネタ・PoC・設計書候補まで一気に判断できます。`
              : "今日のAI情報を提案に使える形へ整理します。"
          )}
        </p>
      </div>
      <div class="hero-actions">
        <span class="status-pill">Mode: <strong>${escapeHtml(state.config?.appMode || "mock")}</strong></span>
        <span class="status-pill">推定コスト: <strong>${escapeHtml(estimateCost(state.config, state.result))}</strong></span>
        <button class="primary-button" type="button" data-action="retry">Run</button>
      </div>
    </section>

    <section class="summary-grid">
      ${renderSummaryCard("本日の新着件数", counts.newItems, "今日確認したAI情報")}
      ${renderSummaryCard("重要ネタ件数", counts.important, "S/Aランク中心")}
      ${renderSummaryCard("PoC候補件数", counts.poc, "小さく試せるテーマ")}
      ${renderSummaryCard("設計書候補件数", counts.docs, "すぐに雛形へ展開")}
    </section>

    <section class="brief-section">
      <div class="section-kicker">
        <div>
          <h3>Briefカード</h3>
          <span>ニュース一覧ではなく、今日やる価値順に整理</span>
        </div>
        <button class="text-button" type="button" data-copy-daily="true">Daily Briefをコピー</button>
      </div>
      ${renderFilterBar()}
      <div class="brief-card-list">
        ${
          filteredItems.length
            ? filteredItems.map(renderBriefCard).join("")
            : '<div class="empty-inline">この条件に合うBriefカードはありません。</div>'
        }
      </div>
    </section>

    <section class="split-grid">
      <section class="brief-section">
        <div class="section-kicker">
          <h3>次にやること</h3>
          <span>3日以内に動ける粒度だけ表示</span>
        </div>
        <ul class="todo-list">
          ${topItems(3)
            .map((item) => `<li>${escapeHtml(item.nextAction || item.pocIdeas?.[0] || "PoC対象を決める")}</li>`)
            .join("")}
        </ul>
      </section>

      <section class="brief-section">
        <div class="section-kicker">
          <h3>設計書候補</h3>
          <span>PoCへすぐつなげる候補</span>
        </div>
        <div class="mini-doc-list">
          ${state.result.designDocCandidates.slice(0, 2).map(renderMiniDocCard).join("")}
        </div>
      </section>
    </section>

    ${renderLogPanel()}
  `;
}

function renderTimeline() {
  const model = buildTimelineModel();
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>Timeline</h3>
        <span>ローカル保存を見越した進捗ビュー</span>
      </div>
      <div class="timeline-period-grid">
        ${model.periods
          .map(
            (period) => `
              <article class="timeline-period-card">
                <span>${escapeHtml(period.label)}</span>
                <strong>${escapeHtml(String(period.count))}</strong>
                <p>${escapeHtml(period.note)}</p>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="timeline-status-row">
        ${model.statuses
          .map(
            (status) => `
              <article class="timeline-status-card">
                <span>${escapeHtml(status.label)}</span>
                <strong>${escapeHtml(String(status.value))}</strong>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="timeline-day-list">
        <article class="timeline-day-card">
          <div>
            <time>${escapeHtml(shortDate(state.result.finishedAt))}</time>
            <h4>${escapeHtml(topItems(1)[0]?.whatBecamePossible?.[0] || "AI情報を提案に変換しました")}</h4>
            <p>${escapeHtml(shortDescription(topItems(1)[0] || {}))}</p>
          </div>
          <div class="timeline-metrics">
            <span><strong>${summaryCounts(state.result).important}</strong>重要</span>
            <span><strong>${summaryCounts(state.result).poc}</strong>PoC候補</span>
            <span><strong>${summaryCounts(state.result).docs}</strong>設計書候補</span>
          </div>
          <button class="secondary-button small-button" type="button" data-view-link="today">Briefへ戻る</button>
        </article>
      </div>
    </section>
  `;
}

function renderIdeas() {
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>提案ネタ</h3>
        <span>社内説明や営業初稿に使える内容だけを整理</span>
      </div>
      <div class="idea-grid">
        ${state.rankedItems
          .map(
            (item) => `
              <article class="idea-card">
                <div class="brief-card-top">
                  <span class="rank-badge small">${escapeHtml(item.rank)}</span>
                  <span class="source-pill">${escapeHtml(sourceKindLabel(item))}</span>
                </div>
                <h4>${escapeHtml(proposalTitle(item))}</h4>
                ${renderPriorityReasons(item)}
                <div class="idea-fields">
                  <p><strong>対象</strong>${escapeHtml(item.targetCompanies?.slice(0, 2).join(" / ") || "社内DXチーム")}</p>
                  <p><strong>解決課題</strong>${escapeHtml(item.problemToSolve || item.businessUseCases?.[0] || "業務改善")}</p>
                  <p><strong>期待効果</strong>${escapeHtml(expectedEffect(item))}</p>
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
  const item = state.priorityMap.get(doc.itemId);
  return `
    <article class="doc-card">
      <h4>${escapeHtml(doc.title)}</h4>
      <div class="doc-fields">
        <p><strong>対象業務</strong>${escapeHtml(item?.businessUseCases?.[0] || "業務改善")}</p>
        <p><strong>PoC案</strong>${escapeHtml(item?.pocIdeas?.[0] || "小規模PoC")}</p>
        <p><strong>必要ツール</strong>${escapeHtml((item?.requiredTools || ["業務データ"]).slice(0, 3).join(" / "))}</p>
        <p><strong>次の一手</strong>${escapeHtml(item?.nextAction || "要件を整理する")}</p>
      </div>
      <details class="brief-details">
        <summary>詳細を見る</summary>
        <div class="detail-grid single-column">
          <div class="detail-block">
            <span>セクション</span>
            <p>${escapeHtml((doc.sections || []).join(" / "))}</p>
          </div>
          <div class="detail-block">
            <span>元ネタ</span>
            <p>${escapeHtml(item ? itemTitle(item) : doc.title)}</p>
          </div>
        </div>
      </details>
      <div class="mini-actions">
        <button class="secondary-button small-button" type="button" data-copy="${escapeHtml(buildDesignDocText(doc))}" data-copy-message="設計書候補をコピーしました">Markdownコピー</button>
      </div>
    </article>
  `;
}

function renderDocs() {
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>設計書候補</h3>
        <span>PoCへつなげるための下書き候補</span>
      </div>
      <div class="doc-grid">${state.result.designDocCandidates.map(renderDocCard).join("")}</div>
    </section>
  `;
}

function renderSources() {
  const reports = buildSourceAnalytics();
  const usedFallback = state.result.collection?.usedMockFallback;
  const successCount = reports.filter((source) => source.displayStatus === "success").length;
  const failedCount = reports.filter((source) => source.displayStatus === "failed").length;
  const skippedCount = reports.filter((source) => source.displayStatus === "skipped").length;
  return `
    <section class="brief-section">
      <div class="section-kicker">
        <h3>収集状況</h3>
        <span>${usedFallback ? "Mock表示で継続" : "公開ソース確認済み"}</span>
      </div>
      <div class="summary-grid compact">
        ${renderSummaryCard("success", successCount, "取得できたソース")}
        ${renderSummaryCard("failed", failedCount, "再確認が必要")}
        ${renderSummaryCard("skipped", skippedCount, "fallbackやスキップ")}
        ${renderSummaryCard("today cost", estimateCost(state.config, state.result), "有料呼び出し時のみ")}
      </div>
      <div class="source-status-grid">
        ${reports
          .map(
            (source) => `
              <article class="source-status ${escapeHtml(source.displayStatus)}">
                <div>
                  <span class="status-dot"></span>
                  <strong>${escapeHtml(source.sourceName)}</strong>
                </div>
                <p><strong>status</strong>${escapeHtml(source.displayStatus)}</p>
                <p><strong>fetched count</strong>${escapeHtml(String(source.itemCount))}</p>
                <p><strong>last fetched at</strong>${escapeHtml(shortTime(source.checkedAt))}</p>
                <p><strong>success rate</strong>${escapeHtml(source.successRate)}</p>
                <p><strong>fallback</strong>${escapeHtml(source.fallbackUsed ? "used" : "no")}</p>
                <p><strong>error reason</strong>${escapeHtml(source.error || "なし")}</p>
                <p><strong>直近エラー</strong>${escapeHtml(source.recentError)}</p>
                <p><strong>費用</strong>${escapeHtml(sourceCostType(source))}</p>
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
      if (response.status === 429) throw new Error("無料枠に達した可能性があります。今日はMock表示で続行します。");
      throw new Error("一部の取得に失敗しました。Mock表示で続行しています。");
    }
    state.result = await response.json();
    hydrateRankedItems();
    persistBriefSnapshot(state.result);
    setText("#timestamp", new Date(state.result.finishedAt).toLocaleString("ja-JP"));
    renderConfig(state.config);

    if (state.result.counts.fallbackUsed > 0) {
      showNotice("warning", "一部の取得に失敗しました。Mock表示で続行しています。");
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

function copyText(text, message) {
  navigator.clipboard?.writeText(text);
  showNotice("success", message || "コピーしました");
}

function handleUiAction(action, itemId) {
  const item = state.priorityMap.get(itemId);
  if (!item) return;

  if (action === "slack") {
    markActionState(itemId, "slack");
    copyText(buildSlackText(item), "Slack共有文をコピーしました");
    renderActiveView();
    return;
  }
  if (action === "notion") {
    markActionState(itemId, "notion");
    copyText(buildProposalText(item), "Notion保存用の下書きをコピーしました");
    renderActiveView();
    return;
  }
  if (action === "poc") {
    markActionState(itemId, "poc");
    copyText(buildPocText(item), "PoC案の下書きをコピーしました");
    renderActiveView();
    return;
  }
  if (action === "doc") {
    markActionState(itemId, "doc");
    copyText(buildProposalText(item), "設計書候補メモをコピーしました");
    renderActiveView();
    return;
  }
  if (action === "social") {
    markActionState(itemId, "social");
    copyText(buildSocialText(item), "SNS投稿ネタをコピーしました");
    renderActiveView();
    return;
  }
  if (action === "article") {
    window.open(item.url, "_blank", "noreferrer");
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
  const filterButton = event.target.closest("[data-filter]");
  const uiAction = event.target.closest("[data-ui-action]");

  if (retry) runPipeline();
  if (viewLink) {
    state.activeView = viewLink.dataset.viewLink;
    renderActiveView();
  }
  if (copyButton) {
    copyText(copyButton.dataset.copy, copyButton.dataset.copyMessage || "コピーしました");
  }
  if (dailyCopy) {
    copyText(buildDailyBriefText(), "Daily Briefをコピーしました");
  }
  if (filterButton) {
    state.activeFilter = filterButton.dataset.filter;
    renderActiveView();
  }
  if (uiAction) {
    handleUiAction(uiAction.dataset.uiAction, uiAction.dataset.itemId);
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
