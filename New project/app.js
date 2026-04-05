(function () {
  const STORAGE_KEY = "net-worth-tracker-v3";
  const LEGACY_KEYS = ["net-worth-tracker-v2", "monthly-account-isa-tracker-v1"];

  const TYPE_OPTIONS = {
    asset: [
      "Current Account",
      "Cash ISA",
      "Stocks & Shares ISA",
      "Lifetime ISA",
      "Innovative Finance ISA",
      "Junior ISA",
      "Savings Account",
      "Investment Account",
      "Shares / ETF",
      "Crypto",
      "Premium Bonds",
      "Pension",
      "Other Asset",
    ],
    liability: [
      "Mortgage",
      "Credit Card",
      "Personal Loan",
      "Student Loan",
      "Car Finance",
      "Overdraft",
      "Tax Due",
      "Buy Now Pay Later",
      "Other Liability",
    ],
  };

  const CURRENCY_OPTIONS = [
    "GBP",
    "USD",
    "EUR",
    "AUD",
    "CAD",
    "CHF",
    "CNY",
    "DKK",
    "HKD",
    "INR",
    "JPY",
    "NGN",
    "NOK",
    "NZD",
    "SEK",
    "SGD",
    "ZAR",
  ];

  const COLOUR_POOL = [
    "#1c67d9",
    "#0d8b83",
    "#d78400",
    "#7c3aed",
    "#17844b",
    "#c3473a",
    "#0f766e",
    "#b45309",
    "#334155",
    "#9333ea",
  ];

  const ISA_ANNUAL_ALLOWANCE_GBP = 20000;
  const LIFETIME_ISA_ALLOWANCE_GBP = 4000;
  const MARKET_ENDPOINT = "/api/market-data";

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const currentDateKey = today.toISOString().slice(0, 10);

  const initialState = loadState();

  const state = {
    activeView: initialState.activeView || "overview",
    selectedMonth: initialState.selectedMonth || currentMonthKey,
    lines: initialState.lines || [],
    monthlyValues: initialState.monthlyValues || {},
    monthlyContributions: initialState.monthlyContributions || {},
    marketData: initialState.marketData || createEmptyMarketData(),
    meta: {
      updatedAt: initialState.meta?.updatedAt || Date.now(),
      lastSavedMessage: initialState.meta?.lastSavedMessage || "Saved locally on this device.",
    },
    sync: {
      cloudAvailable: false,
      cloudConfigured: false,
      user: null,
      statusTone: "muted",
      title: "Local only",
      message: "The app works locally now. Add Firebase keys to enable secure cross-device syncing.",
      bootstrapComplete: false,
    },
    marketStatus: {
      tone: "muted",
      title: "Market idle",
      message: "Daily GBP conversion and market prices appear here once the deployed market API is available.",
    },
    install: {
      available: false,
      installed: false,
      hint: "Install to home screen on iPhone or desktop for an app-like experience.",
    },
  };

  const runtime = {
    cloud: null,
    remoteUnsubscribe: null,
    pendingCloudSave: null,
    applyingRemoteState: false,
    refreshInFlight: false,
    beforeInstallPrompt: null,
    pendingSignOutReset: false,
  };

  const elements = {
    overviewTab: document.querySelector("#overviewTab"),
    entryTab: document.querySelector("#entryTab"),
    overviewView: document.querySelector("#overviewView"),
    entryView: document.querySelector("#entryView"),
    goToEntryButton: document.querySelector("#goToEntryButton"),
    openOverviewButton: document.querySelector("#openOverviewButton"),
    installAppButton: document.querySelector("#installAppButton"),
    installHint: document.querySelector("#installHint"),
    exportButton: document.querySelector("#exportButton"),
    importButton: document.querySelector("#importButton"),
    importFileInput: document.querySelector("#importFileInput"),
    monthInput: document.querySelector("#monthInput"),
    previousMonthButton: document.querySelector("#previousMonthButton"),
    nextMonthButton: document.querySelector("#nextMonthButton"),
    addLineForm: document.querySelector("#addLineForm"),
    lineName: document.querySelector("#lineName"),
    lineKind: document.querySelector("#lineKind"),
    lineType: document.querySelector("#lineType"),
    lineCurrency: document.querySelector("#lineCurrency"),
    lineColor: document.querySelector("#lineColor"),
    lineValuationMode: document.querySelector("#lineValuationMode"),
    marketSource: document.querySelector("#marketSource"),
    marketSymbol: document.querySelector("#marketSymbol"),
    marketFields: document.querySelector("#marketFields"),
    valuationModeField: document.querySelector("#valuationModeField"),
    lineStartingValue: document.querySelector("#lineStartingValue"),
    lineStartingValueLabel: document.querySelector("#lineStartingValueLabel"),
    syncBadge: document.querySelector("#syncBadge"),
    syncTitle: document.querySelector("#syncTitle"),
    syncMessage: document.querySelector("#syncMessage"),
    syncNowButton: document.querySelector("#syncNowButton"),
    marketBadge: document.querySelector("#marketBadge"),
    marketTitle: document.querySelector("#marketTitle"),
    marketMessage: document.querySelector("#marketMessage"),
    marketSummary: document.querySelector("#marketSummary"),
    marketWarningsList: document.querySelector("#marketWarningsList"),
    refreshMarketButton: document.querySelector("#refreshMarketButton"),
    refreshMarketButtonSecondary: document.querySelector("#refreshMarketButtonSecondary"),
    cloudSetupNotice: document.querySelector("#cloudSetupNotice"),
    authForm: document.querySelector("#authForm"),
    authEmail: document.querySelector("#authEmail"),
    authPassword: document.querySelector("#authPassword"),
    createAccountButton: document.querySelector("#createAccountButton"),
    signedInPanel: document.querySelector("#signedInPanel"),
    signedInText: document.querySelector("#signedInText"),
    signOutButton: document.querySelector("#signOutButton"),
    saveStatus: document.querySelector("#saveStatus"),
    netWorthValue: document.querySelector("#netWorthValue"),
    assetsValue: document.querySelector("#assetsValue"),
    liabilitiesValue: document.querySelector("#liabilitiesValue"),
    monthlyNetChangeValue: document.querySelector("#monthlyNetChangeValue"),
    monthlyNetChangeLabel: document.querySelector("#monthlyNetChangeLabel"),
    selectedMonthLabel: document.querySelector("#selectedMonthLabel"),
    assetBreakdownLabel: document.querySelector("#assetBreakdownLabel"),
    liabilityBreakdownLabel: document.querySelector("#liabilityBreakdownLabel"),
    marketTrackedValue: document.querySelector("#marketTrackedValue"),
    marketTrackedLabel: document.querySelector("#marketTrackedLabel"),
    fxCoverageValue: document.querySelector("#fxCoverageValue"),
    fxCoverageLabel: document.querySelector("#fxCoverageLabel"),
    entryNetWorthValue: document.querySelector("#entryNetWorthValue"),
    entryAssetsValue: document.querySelector("#entryAssetsValue"),
    entryLiabilitiesValue: document.querySelector("#entryLiabilitiesValue"),
    trendMeta: document.querySelector("#trendMeta"),
    allocationChart: document.querySelector("#allocationChart"),
    allocationLegend: document.querySelector("#allocationLegend"),
    trendChart: document.querySelector("#trendChart"),
    insightsList: document.querySelector("#insightsList"),
    recentMonthsTable: document.querySelector("#recentMonthsTable"),
    isaDeadlineLabel: document.querySelector("#isaDeadlineLabel"),
    isaBalanceValue: document.querySelector("#isaBalanceValue"),
    isaContributionValue: document.querySelector("#isaContributionValue"),
    isaRemainingValue: document.querySelector("#isaRemainingValue"),
    lisaContributionValue: document.querySelector("#lisaContributionValue"),
    isaInsightsList: document.querySelector("#isaInsightsList"),
    assetLinesGrid: document.querySelector("#assetLinesGrid"),
    liabilityLinesGrid: document.querySelector("#liabilityLinesGrid"),
    insightItemTemplate: document.querySelector("#insightItemTemplate"),
  };

  bootstrap();

  async function bootstrap() {
    ensureMonthRecord(state.selectedMonth);
    populateStaticSelects();
    bindEvents();
    registerPwaSupport();
    syncMarketUiWithState();
    render();
    await initializeCloudSync();
    await maybeAutoRefreshMarketData();
  }

  function populateStaticSelects() {
    elements.lineKind.innerHTML = `
      <option value="asset">Asset</option>
      <option value="liability">Liability</option>
    `;
    elements.lineKind.value = "asset";
    populateSelectFromArray(elements.lineCurrency, CURRENCY_OPTIONS, "GBP");
    refreshTypeSelect();
    updateAddFormUi();
  }

  function bindEvents() {
    elements.overviewTab.addEventListener("click", () => setActiveView("overview"));
    elements.entryTab.addEventListener("click", () => setActiveView("entry"));
    elements.goToEntryButton.addEventListener("click", () => {
      setActiveView("entry");
      elements.lineName.focus();
    });
    elements.openOverviewButton.addEventListener("click", () => setActiveView("overview"));

    elements.installAppButton.addEventListener("click", installApp);
    elements.exportButton.addEventListener("click", exportState);
    elements.importButton.addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", importStateFromFile);

    elements.monthInput.addEventListener("change", (event) => {
      state.selectedMonth = event.target.value || currentMonthKey;
      ensureMonthRecord(state.selectedMonth);
      persistState("Selected month updated.");
      render();
    });

    elements.previousMonthButton.addEventListener("click", () => shiftSelectedMonth(-1));
    elements.nextMonthButton.addEventListener("click", () => shiftSelectedMonth(1));

    elements.lineKind.addEventListener("change", () => {
      refreshTypeSelect();
      updateAddFormUi();
    });

    elements.lineValuationMode.addEventListener("change", updateAddFormUi);
    elements.marketSource.addEventListener("change", updateAddFormUi);

    elements.addLineForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addLineFromForm();
    });

    elements.authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await signInWithEmail();
    });

    elements.createAccountButton.addEventListener("click", async () => {
      await createAccountWithEmail();
    });

    elements.signOutButton.addEventListener("click", async () => {
      if (!runtime.cloud) {
        return;
      }

      try {
        runtime.pendingSignOutReset = true;
        await runtime.cloud.signOut();
      } catch (error) {
        runtime.pendingSignOutReset = false;
        setSyncStatus("Sign out failed. Please try again.", "danger", "Sign-out issue");
        render();
      }
    });

    elements.syncNowButton.addEventListener("click", async () => {
      await syncNow();
    });

    elements.refreshMarketButton.addEventListener("click", async () => {
      await refreshMarketData(true);
    });

    elements.refreshMarketButtonSecondary.addEventListener("click", async () => {
      await refreshMarketData(true);
    });
  }

  function render() {
    applyViewState();
    updateAddFormUi();
    renderSummaryCards();
    renderAllocationChart();
    renderTrendChart();
    renderInsights();
    renderRecentMonths();
    renderIsaSummary();
    renderEntrySummary();
    renderLineGroups();
    renderSyncUi();
    renderMarketUi();
    renderInstallUi();
    elements.monthInput.value = state.selectedMonth;
    elements.saveStatus.textContent = state.meta.lastSavedMessage;
  }

  function setActiveView(view) {
    state.activeView = view;
    state.meta.updatedAt = Date.now();
    saveLocalState();
    applyViewState();
  }

  function applyViewState() {
    const isOverview = state.activeView === "overview";
    elements.overviewTab.classList.toggle("is-active", isOverview);
    elements.entryTab.classList.toggle("is-active", !isOverview);
    elements.overviewView.classList.toggle("is-hidden", !isOverview);
    elements.entryView.classList.toggle("is-hidden", isOverview);
  }

  function refreshTypeSelect() {
    const kind = elements.lineKind.value || "asset";
    elements.lineType.innerHTML = TYPE_OPTIONS[kind]
      .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
      .join("");
  }

  function updateAddFormUi() {
    const kind = elements.lineKind.value || "asset";
    const isMarket = kind === "asset" && elements.lineValuationMode.value === "market";
    elements.valuationModeField.classList.toggle("is-hidden", kind !== "asset");
    elements.marketFields.classList.toggle("is-hidden", !isMarket);
    elements.lineStartingValueLabel.textContent =
      kind === "liability"
        ? "Opening amount owed"
        : isMarket
          ? "Opening quantity"
          : "Opening balance";
  }

  function addLineFromForm() {
    const kind = elements.lineKind.value;
    const isMarket = kind === "asset" && elements.lineValuationMode.value === "market";
    const line = {
      id: getUuid(),
      name: elements.lineName.value.trim(),
      kind,
      type: elements.lineType.value,
      currency: elements.lineCurrency.value,
      color: elements.lineColor.value,
      valuationMode: kind === "liability" ? "manual" : elements.lineValuationMode.value,
      marketSource: isMarket ? elements.marketSource.value : "",
      marketSymbol: isMarket ? normalizeSymbol(elements.marketSymbol.value) : "",
      createdAt: new Date().toISOString(),
    };

    if (!line.name) {
      return;
    }

    state.lines.push(line);
    ensureMonthRecord(state.selectedMonth);
    state.monthlyValues[state.selectedMonth][line.id] = Number(elements.lineStartingValue.value) || 0;

    elements.addLineForm.reset();
    elements.lineColor.value = nextAvailableColour();
    elements.lineCurrency.value = "GBP";
    elements.lineKind.value = "asset";
    elements.lineValuationMode.value = "manual";
    elements.marketSource.value = "crypto";
    refreshTypeSelect();
    updateAddFormUi();

    persistState(`${line.name} added.`);
    render();
    if (line.currency !== "GBP" || line.valuationMode === "market") {
      void maybeAutoRefreshMarketData(true);
    }
  }

  function renderSummaryCards() {
    const metrics = getMonthMetrics(state.selectedMonth);
    const previousMonth = getPreviousExistingMonth(state.selectedMonth);
    const previousMetrics = previousMonth ? getMonthMetrics(previousMonth) : null;
    const netChange = previousMetrics ? metrics.netWorth - previousMetrics.netWorth : null;
    const netChangePercent =
      previousMetrics && previousMetrics.netWorth !== 0 ? (netChange / previousMetrics.netWorth) * 100 : null;

    const assetCount = getLinesByKind("asset").length;
    const liabilityCount = getLinesByKind("liability").length;
    const marketLines = getMarketLines();
    const trackedMarketValue = marketLines.reduce((sum, line) => {
      const snapshot = getLineSnapshot(line, state.selectedMonth);
      return sum + (snapshot.gbpValue || 0);
    }, 0);

    const currencies = getTrackedCurrencies();

    elements.netWorthValue.textContent = formatMoney(metrics.netWorth, "GBP");
    elements.assetsValue.textContent = formatMoney(metrics.assets, "GBP");
    elements.liabilitiesValue.textContent = formatMoney(metrics.liabilities, "GBP");
    elements.monthlyNetChangeValue.textContent =
      netChange === null ? "£0" : formatMoney(netChange, "GBP");
    elements.monthlyNetChangeValue.style.color =
      netChange > 0 ? "var(--positive)" : netChange < 0 ? "var(--negative)" : "var(--text)";
    elements.monthlyNetChangeLabel.textContent =
      netChangePercent === null
        ? "Add a previous month to compare"
        : `${netChange >= 0 ? "+" : ""}${netChangePercent.toFixed(1)}% versus last month`;
    elements.selectedMonthLabel.textContent = formatLongMonth(state.selectedMonth);
    elements.assetBreakdownLabel.textContent = `${assetCount} asset line${assetCount === 1 ? "" : "s"}`;
    elements.liabilityBreakdownLabel.textContent = `${liabilityCount} liability line${liabilityCount === 1 ? "" : "s"}`;
    elements.marketTrackedValue.textContent = formatMoney(trackedMarketValue, "GBP");
    elements.marketTrackedLabel.textContent = `${marketLines.length} live-priced holding${marketLines.length === 1 ? "" : "s"}`;
    elements.fxCoverageValue.textContent = String(currencies.length);
    elements.fxCoverageLabel.textContent =
      currencies.length === 1 ? "GBP only so far" : `${currencies.join(", ")} tracked`;
  }

  function renderEntrySummary() {
    const metrics = getMonthMetrics(state.selectedMonth);
    elements.entryNetWorthValue.textContent = formatMoney(metrics.netWorth, "GBP");
    elements.entryAssetsValue.textContent = formatMoney(metrics.assets, "GBP");
    elements.entryLiabilitiesValue.textContent = formatMoney(metrics.liabilities, "GBP");
  }

  function renderLineGroups() {
    renderLineGroup("asset", elements.assetLinesGrid);
    renderLineGroup("liability", elements.liabilityLinesGrid);
  }

  function renderLineGroup(kind, target) {
    const lines = getLinesByKind(kind);
    target.innerHTML = "";

    if (lines.length === 0) {
      target.innerHTML = `<div class="empty-state">No ${kind} lines yet. Add one from the sidebar.</div>`;
      return;
    }

    lines.forEach((line) => {
      const currentSnapshot = getLineSnapshot(line, state.selectedMonth);
      const previousMonth = getPreviousExistingMonth(state.selectedMonth);
      const previousSnapshot = previousMonth ? getLineSnapshot(line, previousMonth) : null;
      const changeGbp =
        currentSnapshot.gbpValue !== null && previousSnapshot && previousSnapshot.gbpValue !== null
          ? currentSnapshot.gbpValue - previousSnapshot.gbpValue
          : null;
      const isaContribution = isIsaType(line.type) ? getStoredContributionValue(line.id, state.selectedMonth) : 0;

      const card = document.createElement("article");
      card.className = "line-card";
      card.innerHTML = `
        <div class="line-card-top">
          <div class="line-card-title">
            <span class="colour-dot" style="background:${line.color}"></span>
            <div class="line-card-heading">
              <input class="line-name-input" type="text" value="${escapeHtml(line.name)}" aria-label="Line name" />
              <span class="line-subtext">${escapeHtml(line.type)} • ${escapeHtml(line.currency)} • ${line.kind === "asset" && line.valuationMode === "market" ? "Live-priced" : "Manual"}</span>
            </div>
          </div>
          <button class="icon-button remove-line-button" type="button">Remove</button>
        </div>

        <div class="line-card-controls">
          <div class="line-card-row three">
            <label class="field">
              <span>Type</span>
              <select class="line-type-select">${renderOptions(TYPE_OPTIONS[kind], line.type)}</select>
            </label>
            <label class="field">
              <span>Currency</span>
              <select class="line-currency-select">${renderOptions(CURRENCY_OPTIONS, line.currency)}</select>
            </label>
            <label class="field">
              <span>Colour</span>
              <input class="line-colour-input" type="color" value="${line.color}" />
            </label>
          </div>

          ${kind === "asset" ? `
            <div class="line-card-row ${line.valuationMode === "market" ? "three" : ""}">
              <label class="field">
                <span>Value type</span>
                <select class="line-valuation-select">
                  <option value="manual" ${line.valuationMode === "manual" ? "selected" : ""}>Manual balance</option>
                  <option value="market" ${line.valuationMode === "market" ? "selected" : ""}>Live-priced holding</option>
                </select>
              </label>
              ${line.valuationMode === "market" ? `
                <label class="field">
                  <span>Market source</span>
                  <select class="line-market-source-select">
                    <option value="crypto" ${line.marketSource === "crypto" ? "selected" : ""}>Crypto</option>
                    <option value="stock" ${line.marketSource === "stock" ? "selected" : ""}>Share / ETF</option>
                  </select>
                </label>
                <label class="field">
                  <span>Ticker / coin code</span>
                  <input class="line-market-symbol-input" type="text" value="${escapeHtml(line.marketSymbol || "")}" placeholder="BTC or AAPL" />
                </label>
              ` : ""}
            </div>
          ` : ""}

          <div class="line-card-row">
            <label class="field">
              <span>${kind === "liability" ? "Amount owed" : line.valuationMode === "market" ? "Units held" : "Balance"}</span>
              <input class="line-value-input" type="number" step="0.000001" value="${formatInputValue(getStoredEntryValue(line.id, state.selectedMonth))}" />
            </label>

            <div class="line-card-meta">
              <span class="change-chip ${getDirectionalChangeClass(kind, changeGbp)}">${changeGbp === null ? "No comparison" : formatMoney(changeGbp, "GBP")}</span>
              <span class="line-card-note">${previousMonth ? `Compared with ${formatShortMonth(previousMonth)} using latest FX / prices.` : "No previous month recorded yet."}</span>
            </div>
          </div>

          ${kind === "asset" && isIsaType(line.type) ? `
            <div class="line-card-row">
              <label class="field">
                <span>ISA contribution this month</span>
                <input class="line-contribution-input" type="number" step="0.01" value="${formatInputValue(isaContribution)}" />
              </label>
              <div class="line-card-meta">
                <span class="change-chip">${convertToGbp(isaContribution, line.currency) === null ? "Waiting for FX" : formatMoney(convertToGbp(isaContribution, line.currency), "GBP")}</span>
                <span class="line-card-note">Counts toward the tax-year ISA allowance panel up to the current 5 April deadline.</span>
              </div>
            </div>
          ` : ""}

          <div class="line-card-meta">
            <div class="value-stack">
              <span>Native value</span>
              <strong>${currentSnapshot.nativeValue === null ? "Waiting for quote" : formatMoney(currentSnapshot.nativeValue, line.currency)}</strong>
              <span class="value-hint">${currentSnapshot.nativeHint}</span>
            </div>
            <div class="value-stack">
              <span>GBP value</span>
              <strong>${currentSnapshot.gbpValue === null ? "Waiting for FX" : formatMoney(currentSnapshot.gbpValue, "GBP")}</strong>
              <span class="value-hint">${currentSnapshot.gbpHint}</span>
            </div>
            ${currentSnapshot.marketHint ? `<span class="line-card-note">${escapeHtml(currentSnapshot.marketHint)}</span>` : ""}
          </div>
        </div>
      `;

      wireLineCard(card, line);
      target.appendChild(card);
    });
  }

  function wireLineCard(card, line) {
    const nameInput = card.querySelector(".line-name-input");
    const typeSelect = card.querySelector(".line-type-select");
    const currencySelect = card.querySelector(".line-currency-select");
    const colourInput = card.querySelector(".line-colour-input");
    const valueInput = card.querySelector(".line-value-input");
    const removeButton = card.querySelector(".remove-line-button");
    const valuationSelect = card.querySelector(".line-valuation-select");
    const marketSourceSelect = card.querySelector(".line-market-source-select");
    const marketSymbolInput = card.querySelector(".line-market-symbol-input");
    const contributionInput = card.querySelector(".line-contribution-input");

    nameInput.addEventListener("change", (event) => {
      line.name = event.target.value.trim() || line.name;
      persistState(`${line.name} updated.`);
      render();
    });

    typeSelect.addEventListener("change", (event) => {
      line.type = event.target.value;
      persistState(`${line.name} updated.`);
      render();
    });

    currencySelect.addEventListener("change", (event) => {
      line.currency = event.target.value;
      persistState(`${line.name} currency updated.`);
      render();
      void maybeAutoRefreshMarketData(true);
    });

    colourInput.addEventListener("input", (event) => {
      line.color = event.target.value;
      persistState(`${line.name} colour updated.`);
      render();
    });

    valueInput.addEventListener("change", (event) => {
      ensureMonthRecord(state.selectedMonth);
      state.monthlyValues[state.selectedMonth][line.id] = Number(event.target.value) || 0;
      persistState(`${line.name} saved.`);
      render();
    });

    if (valuationSelect) {
      valuationSelect.addEventListener("change", (event) => {
        line.valuationMode = event.target.value;
        if (line.valuationMode === "manual") {
          line.marketSource = "";
          line.marketSymbol = "";
        } else {
          line.marketSource = line.marketSource || "crypto";
        }
        persistState(`${line.name} updated.`);
        render();
        void maybeAutoRefreshMarketData(true);
      });
    }

    if (marketSourceSelect) {
      marketSourceSelect.addEventListener("change", (event) => {
        line.marketSource = event.target.value;
        persistState(`${line.name} updated.`);
        render();
        void maybeAutoRefreshMarketData(true);
      });
    }

    if (marketSymbolInput) {
      marketSymbolInput.addEventListener("change", (event) => {
        line.marketSymbol = normalizeSymbol(event.target.value);
        persistState(`${line.name} symbol updated.`);
        render();
        void maybeAutoRefreshMarketData(true);
      });
    }

    if (contributionInput) {
      contributionInput.addEventListener("change", (event) => {
        ensureMonthRecord(state.selectedMonth);
        state.monthlyContributions[state.selectedMonth][line.id] = Math.max(0, Number(event.target.value) || 0);
        persistState(`${line.name} ISA contribution saved.`);
        render();
      });
    }

    removeButton.addEventListener("click", () => removeLine(line.id));
  }

  function renderAllocationChart() {
    const canvas = elements.allocationChart;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    elements.allocationLegend.innerHTML = "";

    const assets = getLinesByKind("asset")
      .map((line) => ({ line, snapshot: getLineSnapshot(line, state.selectedMonth) }))
      .filter((entry) => entry.snapshot.gbpValue && entry.snapshot.gbpValue > 0)
      .sort((left, right) => right.snapshot.gbpValue - left.snapshot.gbpValue);

    if (assets.length === 0) {
      drawEmptyChartState(context, canvas, "Add balances to see your asset allocation.");
      return;
    }

    const total = assets.reduce((sum, entry) => sum + entry.snapshot.gbpValue, 0);
    const centerX = 170;
    const centerY = canvas.height / 2;
    const outerRadius = 102;
    const innerRadius = 50;
    let startAngle = -Math.PI / 2;

    assets.forEach((entry) => {
      const slice = (entry.snapshot.gbpValue / total) * Math.PI * 2;
      const endAngle = startAngle + slice;

      context.beginPath();
      context.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      context.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      context.closePath();
      context.fillStyle = entry.line.color;
      context.fill();
      startAngle = endAngle;

      const legendItem = document.createElement("div");
      legendItem.className = "legend-item";
      legendItem.innerHTML = `
        <div class="legend-label">
          <span class="colour-dot" style="background:${entry.line.color}"></span>
          <span>${escapeHtml(entry.line.name)}</span>
        </div>
        <span>${formatMoney(entry.snapshot.gbpValue, "GBP")}</span>
      `;
      elements.allocationLegend.appendChild(legendItem);
    });

    context.fillStyle = "#607080";
    context.font = "700 14px Manrope";
    context.textAlign = "center";
    context.fillText("Assets", centerX, centerY - 8);
    context.fillStyle = "#18222d";
    context.font = "800 20px Manrope";
    context.fillText(formatMoney(total, "GBP"), centerX, centerY + 18);
  }

  function renderTrendChart() {
    const canvas = elements.trendChart;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    const months = getSortedMonths().slice(-12);
    if (months.length === 0) {
      drawEmptyChartState(context, canvas, "Your monthly trend appears after you record balances.");
      return;
    }

    const series = months.map((month) => {
      const metrics = getMonthMetrics(month);
      return {
        month,
        assets: metrics.assets,
        liabilities: metrics.liabilities,
        netWorth: metrics.netWorth,
      };
    });

    const maxValue = Math.max(...series.flatMap((point) => [point.assets, point.liabilities, point.netWorth]), 1);
    const minValue = Math.min(...series.flatMap((point) => [point.assets, point.liabilities, point.netWorth]), 0);
    const range = Math.max(maxValue - minValue, 1);

    const box = {
      left: 58,
      right: canvas.width - 24,
      top: 28,
      bottom: canvas.height - 44,
    };

    context.strokeStyle = "rgba(96, 112, 128, 0.18)";
    context.lineWidth = 1;
    for (let index = 0; index < 4; index += 1) {
      const y = box.top + ((box.bottom - box.top) / 3) * index;
      context.beginPath();
      context.moveTo(box.left, y);
      context.lineTo(box.right, y);
      context.stroke();
    }

    const zeroY = box.bottom - ((0 - minValue) / range) * (box.bottom - box.top);
    context.beginPath();
    context.moveTo(box.left, zeroY);
    context.lineTo(box.right, zeroY);
    context.strokeStyle = "rgba(24, 34, 45, 0.28)";
    context.lineWidth = 1.2;
    context.stroke();

    drawSeries(context, box, series, "assets", minValue, range, "#1c67d9");
    drawSeries(context, box, series, "liabilities", minValue, range, "#c3473a");
    drawSeries(context, box, series, "netWorth", minValue, range, "#0d8b83");

    context.fillStyle = "#607080";
    context.font = "700 12px Manrope";
    context.textAlign = "left";
    context.fillText(formatMoney(maxValue, "GBP"), 10, box.top + 4);
    context.fillText(formatMoney((maxValue + minValue) / 2, "GBP"), 10, (box.top + box.bottom) / 2);
    context.fillText(formatMoney(minValue, "GBP"), 10, box.bottom);

    series.forEach((point, index) => {
      const x = box.left + (index / Math.max(series.length - 1, 1)) * (box.right - box.left);
      context.fillStyle = "#607080";
      context.textAlign = "center";
      context.fillText(formatShortMonth(point.month), x, canvas.height - 16);
    });

    elements.trendMeta.textContent =
      getMarketLines().length > 0 || getTrackedCurrencies().length > 1
        ? "Latest FX and market prices applied to recorded positions."
        : "Up to 12 months";
  }

  function drawSeries(context, box, series, key, minValue, range, colour) {
    const points = series.map((point, index) => {
      const x = box.left + (index / Math.max(series.length - 1, 1)) * (box.right - box.left);
      const y = box.bottom - ((point[key] - minValue) / range) * (box.bottom - box.top);
      return { x, y };
    });

    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.strokeStyle = colour;
    context.lineWidth = key === "netWorth" ? 4 : 2.4;
    context.stroke();

    points.forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, key === "netWorth" ? 4.6 : 3.6, 0, Math.PI * 2);
      context.fillStyle = colour;
      context.fill();
    });
  }

  function renderInsights() {
    elements.insightsList.innerHTML = "";

    const selectedMetrics = getMonthMetrics(state.selectedMonth);
    const previousMonth = getPreviousExistingMonth(state.selectedMonth);
    const previousMetrics = previousMonth ? getMonthMetrics(previousMonth) : null;
    const assetLines = getLinesByKind("asset");
    const liabilityLines = getLinesByKind("liability");
    const assetSnapshots = assetLines
      .map((line) => ({ line, snapshot: getLineSnapshot(line, state.selectedMonth) }))
      .sort((left, right) => (right.snapshot.gbpValue || 0) - (left.snapshot.gbpValue || 0));
    const liabilitySnapshots = liabilityLines
      .map((line) => ({ line, snapshot: getLineSnapshot(line, state.selectedMonth) }))
      .sort((left, right) => (right.snapshot.gbpValue || 0) - (left.snapshot.gbpValue || 0));

    const isaTotal = assetSnapshots
      .filter((entry) => entry.line.type.includes("ISA"))
      .reduce((sum, entry) => sum + (entry.snapshot.gbpValue || 0), 0);
    const nonGbpTotal = assetSnapshots
      .filter((entry) => entry.line.currency !== "GBP")
      .reduce((sum, entry) => sum + (entry.snapshot.gbpValue || 0), 0);
    const marketTotal = assetSnapshots
      .filter((entry) => entry.line.valuationMode === "market")
      .reduce((sum, entry) => sum + (entry.snapshot.gbpValue || 0), 0);
    const missingQuotes = assetSnapshots.filter(
      (entry) => entry.line.valuationMode === "market" && entry.snapshot.nativeValue === null,
    ).length;
    const missingFx = state.lines.filter(
      (line) => line.currency !== "GBP" && getFxRate(line.currency) === null,
    ).length;

    const movements = state.lines.map((line) => {
      const current = getLineSnapshot(line, state.selectedMonth).gbpValue || 0;
      const previous = previousMonth ? getLineSnapshot(line, previousMonth).gbpValue || 0 : 0;
      return { line, change: current - previous };
    });

    const biggestRise = [...movements].sort((left, right) => right.change - left.change)[0];
    const biggestDrop = [...movements].sort((left, right) => left.change - right.change)[0];
    const latestRates = Object.keys(state.marketData.fxRates || {}).length;

    const insights = [
      {
        title: "ISA share",
        value:
          selectedMetrics.assets > 0
            ? `${((isaTotal / selectedMetrics.assets) * 100).toFixed(1)}% of assets sit in ISAs`
            : "Add asset balances to calculate this",
      },
      {
        title: "Non-GBP exposure",
        value:
          selectedMetrics.assets > 0
            ? `${((nonGbpTotal / selectedMetrics.assets) * 100).toFixed(1)}% of assets are outside GBP`
            : "No FX exposure yet",
      },
      {
        title: "Live-priced exposure",
        value:
          selectedMetrics.assets > 0
            ? `${((marketTotal / selectedMetrics.assets) * 100).toFixed(1)}% of assets use refreshed market prices`
            : "No market-tracked holdings yet",
      },
      {
        title: "Debt ratio",
        value:
          selectedMetrics.assets > 0
            ? `${((selectedMetrics.liabilities / selectedMetrics.assets) * 100).toFixed(1)}% liabilities-to-assets`
            : "No asset base to compare yet",
      },
      {
        title: "Largest asset",
        value:
          assetSnapshots[0] && assetSnapshots[0].snapshot.gbpValue
            ? `${assetSnapshots[0].line.name} (${formatMoney(assetSnapshots[0].snapshot.gbpValue, "GBP")})`
            : "No asset balance yet",
      },
      {
        title: "Largest liability",
        value:
          liabilitySnapshots[0] && liabilitySnapshots[0].snapshot.gbpValue
            ? `${liabilitySnapshots[0].line.name} (${formatMoney(liabilitySnapshots[0].snapshot.gbpValue, "GBP")})`
            : "No liabilities recorded",
      },
      {
        title: "Biggest mover up",
        value:
          biggestRise && biggestRise.change !== 0
            ? `${biggestRise.line.name} (${formatMoney(biggestRise.change, "GBP")})`
            : "No upward movement yet",
      },
      {
        title: "Biggest mover down",
        value:
          biggestDrop && biggestDrop.change !== 0
            ? `${biggestDrop.line.name} (${formatMoney(biggestDrop.change, "GBP")})`
            : "No downward movement yet",
      },
      {
        title: "Market data coverage",
        value: `${latestRates} currencies loaded, ${missingQuotes} holdings waiting for quotes, ${missingFx} lines waiting for FX`,
      },
      {
        title: "Liability direction",
        value:
          previousMetrics === null
            ? "Add a previous month to compare debt movement"
            : selectedMetrics.liabilities < previousMetrics.liabilities
              ? `Liabilities fell by ${formatMoney(previousMetrics.liabilities - selectedMetrics.liabilities, "GBP")}`
              : selectedMetrics.liabilities > previousMetrics.liabilities
                ? `Liabilities rose by ${formatMoney(selectedMetrics.liabilities - previousMetrics.liabilities, "GBP")}`
                : "Liabilities were unchanged from last month",
      },
    ];

    insights.forEach((insight) => {
      const clone = elements.insightItemTemplate.content.cloneNode(true);
      clone.querySelector(".insight-title").textContent = insight.title;
      clone.querySelector(".insight-value").textContent = insight.value;
      elements.insightsList.appendChild(clone);
    });
  }

  function renderRecentMonths() {
    const months = getSortedMonths().slice(-8).reverse();

    if (months.length === 0) {
      elements.recentMonthsTable.innerHTML = `<div class="empty-state">Recent month snapshots will appear once data exists.</div>`;
      return;
    }

    const rows = months
      .map((month) => {
        const metrics = getMonthMetrics(month);
        const previousMonth = getPreviousExistingMonth(month);
        const previousMetrics = previousMonth ? getMonthMetrics(previousMonth) : null;
        const netChange = previousMetrics ? metrics.netWorth - previousMetrics.netWorth : null;
        return `
          <tr>
            <td>${formatLongMonth(month)}</td>
            <td>${formatMoney(metrics.assets, "GBP")}</td>
            <td>${formatMoney(metrics.liabilities, "GBP")}</td>
            <td>${formatMoney(metrics.netWorth, "GBP")}</td>
            <td>${netChange === null ? "Starting month" : formatMoney(netChange, "GBP")}</td>
          </tr>
        `;
      })
      .join("");

    elements.recentMonthsTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Assets</th>
            <th>Liabilities</th>
            <th>Net worth</th>
            <th>Net change</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderIsaSummary() {
    elements.isaInsightsList.innerHTML = "";

    const summary = getIsaSummary(state.selectedMonth);
    elements.isaDeadlineLabel.textContent = `Tax deadline ${summary.deadlineLabel}`;
    elements.isaBalanceValue.textContent = formatMoney(summary.totalIsaBalanceGbp, "GBP");
    elements.isaContributionValue.textContent = formatMoney(summary.taxYearContributionGbp, "GBP");
    elements.isaRemainingValue.textContent = formatMoney(summary.remainingAllowanceGbp, "GBP");
    elements.lisaContributionValue.textContent = formatMoney(summary.lifetimeIsaContributionGbp, "GBP");

    const items = [
      {
        title: "Allowance used",
        value: `${summary.allowanceUsagePercent.toFixed(1)}% of the £20,000 ISA allowance`,
      },
      {
        title: "Months counted",
        value: `${summary.taxYearMonths.length} month${summary.taxYearMonths.length === 1 ? "" : "s"} in this tax year`,
      },
      {
        title: "Lifetime ISA remaining",
        value: formatMoney(summary.remainingLifetimeIsaAllowanceGbp, "GBP"),
      },
      {
        title: "Contribution method",
        value: "This panel uses the ISA contribution fields you enter each month, not balance changes.",
      },
      {
        title: "Tax year window",
        value: `${summary.startLabel} to ${summary.deadlineLabel}`,
      },
    ];

    if (summary.missingFxCurrencies.length) {
      items.push({
        title: "Missing FX",
        value: `Some ISA contributions could not convert to GBP yet: ${summary.missingFxCurrencies.join(", ")}`,
      });
    }

    items.forEach((insight) => {
      const clone = elements.insightItemTemplate.content.cloneNode(true);
      clone.querySelector(".insight-title").textContent = insight.title;
      clone.querySelector(".insight-value").textContent = insight.value;
      elements.isaInsightsList.appendChild(clone);
    });
  }

  function renderSyncUi() {
    elements.syncBadge.className = `status-pill ${state.sync.statusTone}`;
    elements.syncBadge.textContent = state.sync.title;
    elements.syncTitle.textContent = state.sync.title;
    elements.syncMessage.textContent = state.sync.message;

    const showCloudSetup = !state.sync.cloudConfigured;
    const showSignedIn = Boolean(state.sync.user);
    const showAuthForm = state.sync.cloudConfigured && !showSignedIn;

    elements.cloudSetupNotice.classList.toggle("is-hidden", !showCloudSetup);
    elements.authForm.classList.toggle("is-hidden", !showAuthForm);
    elements.signedInPanel.classList.toggle("is-hidden", !showSignedIn);
    elements.syncNowButton.disabled = !state.sync.user;

    if (showSignedIn) {
      elements.signedInText.textContent = `Signed in as ${state.sync.user.email}. Use the same login on each device to keep this dashboard aligned.`;
    }
  }

  function renderMarketUi() {
    elements.marketBadge.className = `status-pill ${state.marketStatus.tone}`;
    elements.marketBadge.textContent = state.marketStatus.title;
    elements.marketTitle.textContent = state.marketStatus.title;
    elements.marketMessage.textContent = state.marketStatus.message;
    elements.marketSummary.textContent = getMarketSummaryText();
    elements.marketWarningsList.innerHTML = "";

    (state.marketData.warnings || []).slice(0, 5).forEach((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      elements.marketWarningsList.appendChild(item);
    });

    if (!elements.marketWarningsList.children.length) {
      const item = document.createElement("li");
      item.textContent = "No market warnings right now.";
      elements.marketWarningsList.appendChild(item);
    }
  }

  function renderInstallUi() {
    elements.installAppButton.disabled = !runtime.beforeInstallPrompt && !isIosSafari();
    elements.installHint.textContent = state.install.hint;
  }

  async function initializeCloudSync() {
    if (!window.FinanceTrackerCloud) {
      setSyncStatus("Cloud sync helper is unavailable, so the app is running locally only.", "danger", "Cloud unavailable");
      render();
      return;
    }

    try {
      runtime.cloud = await window.FinanceTrackerCloud.create();
    } catch (error) {
      setSyncStatus("Firebase could not load from this network right now, so the app stayed in local mode.", "danger", "Cloud unavailable");
      render();
      return;
    }

    state.sync.cloudAvailable = runtime.cloud.available;
    state.sync.cloudConfigured = runtime.cloud.configured;

    if (!runtime.cloud.available) {
      setSyncStatus("Add Firebase keys in firebase-config.js to turn on cross-device sync.", "warning", "Local only");
      render();
      return;
    }

    runtime.cloud.onAuthChange(async (user) => {
      const previousUser = state.sync.user;
      state.sync.user = user;
      if (runtime.remoteUnsubscribe) {
        runtime.remoteUnsubscribe();
        runtime.remoteUnsubscribe = null;
      }

      if (!user) {
        if (runtime.pendingSignOutReset || previousUser) {
          runtime.pendingSignOutReset = false;
          resetToBlankTracker("Signed out. Tracker cleared on this device for the next user.");
        }
        state.sync.bootstrapComplete = false;
        setSyncStatus("Sign in with the same email on each device to sync your dashboard.", "muted", "Cloud ready");
        render();
        return;
      }

      setSyncStatus("Checking cloud data for this account...", "warning", "Connecting");
      render();

      runtime.remoteUnsubscribe = runtime.cloud.subscribeToUserState(
        user.uid,
        async (payload) => {
          await reconcileRemoteState(payload, user.uid);
        },
        () => {
          setSyncStatus("Cloud listener hit an error. Local data is still safe.", "danger", "Sync issue");
          render();
        },
      );
    });
  }

  async function reconcileRemoteState(payload, userId) {
    const localUpdatedAt = Number(state.meta.updatedAt) || 0;

    if (!payload) {
      state.sync.bootstrapComplete = true;
      setSyncStatus("No cloud data yet. Your current dashboard will become the cloud copy.", "warning", "First cloud save");
      render();
      await syncNow(true);
      return;
    }

    const remoteState = normalizeLoadedState(payload);
    const remoteUpdatedAt = Number(remoteState.meta.updatedAt) || 0;

    if (!state.sync.bootstrapComplete) {
      state.sync.bootstrapComplete = true;
      if (remoteUpdatedAt > localUpdatedAt) {
        applyLoadedState(remoteState, "Synced from cloud.");
        setSyncStatus(`Signed in as ${state.sync.user.email}. Cloud data loaded successfully.`, "success", "Cloud synced");
      } else if (localUpdatedAt > remoteUpdatedAt) {
        setSyncStatus("Local data is newer, pushing it to the cloud now.", "warning", "Updating cloud");
        await runtime.cloud.saveUserState(userId, serializeState());
        setSyncStatus(`Signed in as ${state.sync.user.email}. Cloud is up to date.`, "success", "Cloud synced");
      } else {
        setSyncStatus(`Signed in as ${state.sync.user.email}. Cloud is up to date.`, "success", "Cloud synced");
      }
      render();
      await maybeAutoRefreshMarketData();
      return;
    }

    if (remoteUpdatedAt > localUpdatedAt && !runtime.applyingRemoteState) {
      applyLoadedState(remoteState, "Updated from cloud.");
      setSyncStatus(`Signed in as ${state.sync.user.email}. Latest changes synced across devices.`, "success", "Cloud synced");
      render();
      await maybeAutoRefreshMarketData();
    }
  }

  async function signInWithEmail() {
    if (!runtime.cloud || !runtime.cloud.available) {
      return;
    }

    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    if (!email || !password) {
      setSyncStatus("Enter your email and password first.", "warning", "Sign-in needed");
      render();
      return;
    }

    try {
      setSyncStatus("Signing in...", "warning", "Connecting");
      render();
      await runtime.cloud.signIn(email, password);
      elements.authPassword.value = "";
    } catch (error) {
      setSyncStatus(error.message || "Sign in failed. Check your details and try again.", "danger", "Sign-in failed");
      render();
    }
  }

  async function createAccountWithEmail() {
    if (!runtime.cloud || !runtime.cloud.available) {
      return;
    }

    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    if (!email || !password) {
      setSyncStatus("Enter an email and password to create the sync account.", "warning", "Account setup");
      render();
      return;
    }

    try {
      setSyncStatus("Creating your cloud account...", "warning", "Creating");
      render();
      await runtime.cloud.signUp(email, password);
      elements.authPassword.value = "";
    } catch (error) {
      setSyncStatus(error.message || "Account creation failed. Please try another email.", "danger", "Setup failed");
      render();
    }
  }

  async function syncNow(isBootstrapPush) {
    if (!runtime.cloud || !runtime.cloud.available) {
      setSyncStatus("Cloud sync is not configured yet.", "warning", "Local only");
      render();
      return;
    }

    if (!state.sync.user) {
      setSyncStatus("Sign in first to sync across devices.", "warning", "Sign-in needed");
      render();
      return;
    }

    try {
      setSyncStatus(isBootstrapPush ? "Creating your first cloud snapshot..." : "Syncing your latest changes...", "warning", "Syncing");
      render();
      await runtime.cloud.saveUserState(state.sync.user.uid, serializeState());
      setSyncStatus(`Signed in as ${state.sync.user.email}. Cloud is up to date.`, "success", "Cloud synced");
      render();
    } catch (error) {
      setSyncStatus(error.message || "Sync failed, but your local data is still saved.", "danger", "Sync issue");
      render();
    }
  }

  async function maybeAutoRefreshMarketData(force) {
    const needsRefresh =
      force ||
      (requiresMarketData() &&
        (!state.marketData.updatedAt || state.marketData.updatedAt.slice(0, 10) !== currentDateKey));

    if (needsRefresh) {
      await refreshMarketData(false);
    }
  }

  async function refreshMarketData(showBusyState) {
    if (runtime.refreshInFlight) {
      return;
    }

    const payload = buildMarketRequestPayload();
    if (!payload.currencies.length && !payload.cryptoSymbols.length && !payload.stockSymbols.length) {
      setMarketStatus("Nothing to refresh yet. Add a non-GBP line or a market-tracked holding first.", "muted", "Market idle");
      render();
      return;
    }

    runtime.refreshInFlight = true;
    if (showBusyState) {
      setMarketStatus("Refreshing Bank of England FX rates and market prices...", "warning", "Refreshing");
      render();
    }

    try {
      const data = await requestMarketData(payload);
      state.marketData = {
        updatedAt: data.updatedAt || new Date().toISOString(),
        fxRates: data.fxRates || { GBP: 1 },
        fxMeta: data.fxMeta || {},
        cryptoQuotes: data.cryptoQuotes || {},
        stockQuotes: data.stockQuotes || {},
        warnings: data.warnings || [],
      };
      syncMarketUiWithState();
      persistState("Market data refreshed.");
      render();
    } catch (error) {
      setMarketStatus(
        "Market refresh failed. Check that the site deploy includes the market-data function (Netlify Functions or Vercel serverless).",
        "danger",
        "Refresh failed",
      );
      state.marketData.warnings = [
        "The market-data endpoint could not be reached.",
        "If you just changed files, redeploy the site so the latest serverless function goes live.",
      ];
      render();
    } finally {
      runtime.refreshInFlight = false;
    }
  }

  async function requestMarketData(payload) {
    const response = await fetch(MARKET_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Market-data endpoint ${MARKET_ENDPOINT} returned ${response.status}`);
    }

    return await response.json();
  }

  function buildMarketRequestPayload() {
    const currencies = getTrackedCurrencies().filter((currency) => currency !== "GBP");
    const cryptoSymbols = uniqueObjects(
      getMarketLines()
        .filter((line) => line.marketSource === "crypto")
        .map((line) => ({ symbol: line.marketSymbol, currency: line.currency })),
    );
    const stockSymbols = uniqueObjects(
      getMarketLines()
        .filter((line) => line.marketSource === "stock")
        .map((line) => ({ symbol: line.marketSymbol, currency: line.currency })),
    );

    return {
      currencies,
      cryptoSymbols,
      stockSymbols,
    };
  }

  function renderMarketSummaryText() {
    return getMarketSummaryText();
  }

  function getMarketSummaryText() {
    const updatedAt = state.marketData.updatedAt;
    if (!updatedAt) {
      return "Pulls Bank of England GBP rates plus free crypto/share market data when available.";
    }

    const dateText = new Date(updatedAt).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fxCount = Object.keys(state.marketData.fxRates || {}).length;
    const quoteCount =
      Object.keys(state.marketData.cryptoQuotes || {}).length + Object.keys(state.marketData.stockQuotes || {}).length;
    return `Last refreshed ${dateText}. Loaded ${fxCount} currencies and ${quoteCount} market quotes.`;
  }

  function syncMarketUiWithState() {
    if (!state.marketData.updatedAt) {
      return;
    }

    const dateText = new Date(state.marketData.updatedAt).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setMarketStatus(`Latest FX / market snapshot saved on ${dateText}.`, "success", "Data refreshed");
  }

  function setSyncStatus(message, tone, title) {
    state.sync.message = message;
    state.sync.statusTone = tone;
    state.sync.title = title;
  }

  function setMarketStatus(message, tone, title) {
    state.marketStatus.message = message;
    state.marketStatus.tone = tone;
    state.marketStatus.title = title;
  }

  function removeLine(lineId) {
    const line = state.lines.find((entry) => entry.id === lineId);
    if (!line) {
      return;
    }

    state.lines = state.lines.filter((entry) => entry.id !== lineId);
    Object.keys(state.monthlyValues).forEach((month) => {
      delete state.monthlyValues[month][lineId];
    });
    Object.keys(state.monthlyContributions).forEach((month) => {
      delete state.monthlyContributions[month][lineId];
    });
    persistState(`${line.name} removed.`);
    render();
  }

  function shiftSelectedMonth(offset) {
    state.selectedMonth = getMonthOffsetKey(state.selectedMonth, offset);
    ensureMonthRecord(state.selectedMonth);
    persistState("Selected month updated.");
    render();
  }

  function getLinesByKind(kind) {
    return state.lines.filter((line) => line.kind === kind);
  }

  function getMarketLines() {
    return getLinesByKind("asset").filter(
      (line) => line.valuationMode === "market" && line.marketSource && line.marketSymbol,
    );
  }

  function getTrackedCurrencies() {
    const currencies = new Set(["GBP"]);
    state.lines.forEach((line) => {
      currencies.add(line.currency || "GBP");
    });
    return Array.from(currencies);
  }

  function requiresMarketData() {
    return state.lines.some(
      (line) => line.currency !== "GBP" || (line.kind === "asset" && line.valuationMode === "market"),
    );
  }

  function getMonthMetrics(month) {
    const assets = getLinesByKind("asset").reduce((sum, line) => sum + (getLineSnapshot(line, month).gbpValue || 0), 0);
    const liabilities = getLinesByKind("liability").reduce(
      (sum, line) => sum + (getLineSnapshot(line, month).gbpValue || 0),
      0,
    );
    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
    };
  }

  function getLineSnapshot(line, month) {
    const entryValue = getStoredEntryValue(line.id, month);
    const quote = line.valuationMode === "market" ? getQuoteForLine(line) : null;
    let nativeValue = entryValue;
    let nativeHint = line.kind === "liability" ? "Stored in the line currency." : "Stored in the line currency.";
    let marketHint = "";

    if (line.kind === "asset" && line.valuationMode === "market") {
      if (quote) {
        nativeValue = entryValue * quote.price;
        nativeHint = `${formatNumber(entryValue)} unit${entryValue === 1 ? "" : "s"} at ${formatMoney(quote.price, line.currency)} each`;
        marketHint = `${quote.source} quote for ${line.marketSymbol} as of ${formatQuoteDate(quote.asOf)}.`;
      } else {
        nativeValue = null;
        nativeHint = `${formatNumber(entryValue)} unit${entryValue === 1 ? "" : "s"} recorded. Refresh prices to value this holding.`;
        marketHint = `No quote is available yet for ${line.marketSymbol || "this holding"}.`;
      }
    }

    const gbpValue = nativeValue === null ? null : convertToGbp(nativeValue, line.currency);
    const fxRate = getFxRate(line.currency);
    const gbpHint =
      line.currency === "GBP"
        ? "Already in GBP."
        : fxRate
          ? `Converted using Bank of England rate: £1 = ${formatRate(fxRate)} ${line.currency}`
          : `No Bank of England conversion loaded yet for ${line.currency}.`;

    return {
      entryValue,
      nativeValue,
      gbpValue,
      nativeHint,
      gbpHint,
      marketHint,
    };
  }

  function getQuoteForLine(line) {
    if (line.marketSource === "crypto") {
      return state.marketData.cryptoQuotes[normalizeSymbol(line.marketSymbol)] || null;
    }
    if (line.marketSource === "stock") {
      return state.marketData.stockQuotes[normalizeSymbol(line.marketSymbol)] || null;
    }
    return null;
  }

  function convertToGbp(amount, currency) {
    if (currency === "GBP") {
      return amount;
    }

    const rate = getFxRate(currency);
    if (!rate) {
      return null;
    }
    return amount / rate;
  }

  function getFxRate(currency) {
    if (currency === "GBP") {
      return 1;
    }
    return state.marketData.fxRates[currency] || null;
  }

  function ensureMonthRecord(month) {
    if (!state.monthlyValues[month]) {
      state.monthlyValues[month] = {};
    }
    if (!state.monthlyContributions[month]) {
      state.monthlyContributions[month] = {};
    }

    state.lines.forEach((line) => {
      if (!(line.id in state.monthlyValues[month])) {
        state.monthlyValues[month][line.id] = 0;
      }
      if (!(line.id in state.monthlyContributions[month])) {
        state.monthlyContributions[month][line.id] = 0;
      }
    });
  }

  function getStoredEntryValue(lineId, month) {
    return Number((state.monthlyValues[month] || {})[lineId] || 0);
  }

  function getStoredContributionValue(lineId, month) {
    return Number((state.monthlyContributions[month] || {})[lineId] || 0);
  }

  function getSortedMonths() {
    return Object.keys(state.monthlyValues).sort();
  }

  function getPreviousExistingMonth(month) {
    const months = getSortedMonths();
    const index = months.indexOf(month);
    return index > 0 ? months[index - 1] : null;
  }

  function persistState(message) {
    state.meta.updatedAt = Date.now();
    state.meta.lastSavedMessage = `${message} Last updated ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}.`;
    saveLocalState();
    queueCloudSave();
  }

  function saveLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
  }

  function queueCloudSave() {
    if (!runtime.cloud || !runtime.cloud.available || !state.sync.user || runtime.applyingRemoteState) {
      return;
    }

    window.clearTimeout(runtime.pendingCloudSave);
    runtime.pendingCloudSave = window.setTimeout(async () => {
      try {
        await runtime.cloud.saveUserState(state.sync.user.uid, serializeState());
        setSyncStatus(`Signed in as ${state.sync.user.email}. Cloud is up to date.`, "success", "Cloud synced");
        render();
      } catch (error) {
        setSyncStatus("Automatic cloud save failed. Local data is still safe.", "danger", "Sync issue");
        render();
      }
    }, 450);
  }

  function serializeState() {
    return {
      version: 3,
      selectedMonth: state.selectedMonth,
      activeView: state.activeView,
      lines: state.lines,
      monthlyValues: state.monthlyValues,
      monthlyContributions: state.monthlyContributions,
      marketData: state.marketData,
      meta: {
        updatedAt: state.meta.updatedAt,
      },
    };
  }

  function applyLoadedState(nextState, message) {
    runtime.applyingRemoteState = true;
    state.selectedMonth = nextState.selectedMonth || currentMonthKey;
    state.activeView = nextState.activeView || "overview";
    state.lines = nextState.lines || [];
    state.monthlyValues = nextState.monthlyValues || {};
    state.monthlyContributions = nextState.monthlyContributions || {};
    state.marketData = nextState.marketData || createEmptyMarketData();
    state.meta.updatedAt = nextState.meta?.updatedAt || Date.now();
    ensureMonthRecord(state.selectedMonth);
    state.meta.lastSavedMessage = `${message} Last updated ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}.`;
    saveLocalState();
    syncMarketUiWithState();
    runtime.applyingRemoteState = false;
    render();
  }

  function exportState() {
    const blob = new Blob([JSON.stringify(serializeState(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `net-worth-tracker-${state.selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
    state.meta.lastSavedMessage = "Export complete.";
    render();
  }

  function importStateFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const normalized = normalizeLoadedState(parsed);
        applyLoadedState(normalized, "Import complete.");
        queueCloudSave();
      } catch (error) {
        state.meta.lastSavedMessage = "Import failed. Please use a valid tracker export.";
        render();
      } finally {
        elements.importFileInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function normalizeLoadedState(raw) {
    if (!raw) {
      return createBlankState();
    }

    if (raw.version === 3) {
      return {
        activeView: raw.activeView || "overview",
        selectedMonth: raw.selectedMonth || currentMonthKey,
        lines: (raw.lines || []).map(normalizeLine),
        monthlyValues: normalizeMonthlyValues(raw.monthlyValues || {}),
        monthlyContributions: normalizeMonthlyValues(raw.monthlyContributions || {}),
        marketData: normalizeMarketData(raw.marketData),
        meta: raw.meta || { updatedAt: Date.now() },
      };
    }

    if (raw.version === 2) {
      return {
        activeView: raw.activeView || "overview",
        selectedMonth: raw.selectedMonth || currentMonthKey,
        lines: (raw.lines || []).map(normalizeLine),
        monthlyValues: normalizeMonthlyValues(raw.monthlyValues || {}),
        monthlyContributions: normalizeMonthlyValues(raw.monthlyContributions || {}),
        marketData: createEmptyMarketData(),
        meta: raw.meta || { updatedAt: Date.now() },
      };
    }

    if (raw.accounts && raw.monthlyBalances) {
      return {
        activeView: "overview",
        selectedMonth: raw.selectedMonth || currentMonthKey,
        lines: (raw.accounts || []).map((account, index) =>
          normalizeLine({
            id: account.id,
            name: account.name,
            kind: "asset",
            type: account.type,
            color: account.color || fallbackColour(index),
            currency: "GBP",
            valuationMode: "manual",
            marketSource: "",
            marketSymbol: "",
            createdAt: account.createdAt || new Date().toISOString(),
          }),
        ),
        monthlyValues: normalizeMonthlyValues(raw.monthlyBalances || {}),
        monthlyContributions: {},
        marketData: createEmptyMarketData(),
        meta: { updatedAt: Date.now() },
      };
    }

    return createBlankState();
  }

  function normalizeLine(line) {
    return {
      id: line.id || getUuid(),
      name: line.name || "Untitled line",
      kind: line.kind === "liability" ? "liability" : "asset",
      type: line.type || (line.kind === "liability" ? "Other Liability" : "Other Asset"),
      color: line.color || fallbackColour(0),
      currency: CURRENCY_OPTIONS.includes(line.currency) ? line.currency : "GBP",
      valuationMode: line.kind === "liability" ? "manual" : line.valuationMode === "market" ? "market" : "manual",
      marketSource: line.marketSource === "stock" ? "stock" : line.marketSource === "crypto" ? "crypto" : "",
      marketSymbol: normalizeSymbol(line.marketSymbol || ""),
      createdAt: line.createdAt || new Date().toISOString(),
    };
  }

  function normalizeMonthlyValues(monthlyValues) {
    const normalized = {};
    Object.keys(monthlyValues || {}).forEach((month) => {
      normalized[month] = {};
      Object.keys(monthlyValues[month] || {}).forEach((lineId) => {
        normalized[month][lineId] = Number(monthlyValues[month][lineId] || 0);
      });
    });
    return normalized;
  }

  function normalizeMarketData(marketData) {
    if (!marketData) {
      return createEmptyMarketData();
    }
    return {
      updatedAt: marketData.updatedAt || "",
      fxRates: marketData.fxRates || { GBP: 1 },
      fxMeta: marketData.fxMeta || {},
      cryptoQuotes: marketData.cryptoQuotes || {},
      stockQuotes: marketData.stockQuotes || {},
      warnings: marketData.warnings || [],
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return normalizeLoadedState(JSON.parse(saved));
      }

      for (let index = 0; index < LEGACY_KEYS.length; index += 1) {
        const item = localStorage.getItem(LEGACY_KEYS[index]);
        if (item) {
          return normalizeLoadedState(JSON.parse(item));
        }
      }
    } catch (error) {
      if (window.console && typeof window.console.error === "function") {
        window.console.error("Unable to load saved data:", error);
      }
    }

    return createBlankState();
  }

  function createBlankState() {
    return {
      activeView: "overview",
      selectedMonth: currentMonthKey,
      lines: [],
      monthlyValues: {
        [currentMonthKey]: {},
      },
      monthlyContributions: {
        [currentMonthKey]: {},
      },
      marketData: createEmptyMarketData(),
      meta: {
        updatedAt: Date.now(),
      },
    };
  }

  function createEmptyMarketData() {
    return {
      updatedAt: "",
      fxRates: {
        GBP: 1,
      },
      fxMeta: {},
      cryptoQuotes: {},
      stockQuotes: {},
      warnings: [],
    };
  }

  function resetToBlankTracker(message) {
    const blank = createBlankState();
    state.activeView = blank.activeView;
    state.selectedMonth = blank.selectedMonth;
    state.lines = blank.lines;
    state.monthlyValues = blank.monthlyValues;
    state.monthlyContributions = blank.monthlyContributions;
    state.marketData = blank.marketData;
    state.meta.updatedAt = Date.now();
    state.meta.lastSavedMessage = message;
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    elements.authEmail.value = "";
    elements.authPassword.value = "";
  }

  function registerPwaSupport() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => undefined);
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      runtime.beforeInstallPrompt = event;
      state.install.available = true;
      state.install.hint = "Tap Install app here, or add the site to your home screen from the browser menu.";
      render();
    });

    window.addEventListener("appinstalled", () => {
      runtime.beforeInstallPrompt = null;
      state.install.installed = true;
      state.install.hint = "The tracker is installed. Open it like an app from your device.";
      render();
    });

    if (isIosSafari()) {
      state.install.hint = "On iPhone, use Safari's Share button and choose Add to Home Screen.";
    }
  }

  async function installApp() {
    if (runtime.beforeInstallPrompt) {
      runtime.beforeInstallPrompt.prompt();
      await runtime.beforeInstallPrompt.userChoice;
      runtime.beforeInstallPrompt = null;
      state.install.hint = "If installation was accepted, the tracker will now appear like an app.";
      render();
      return;
    }

    if (isIosSafari()) {
      state.install.hint = "On iPhone, tap Share in Safari, then choose Add to Home Screen.";
      render();
      return;
    }

    state.install.hint = "Installation is only available after the browser offers it. Keep using the site like normal for now.";
    render();
  }

  function drawEmptyChartState(context, canvas, message) {
    context.fillStyle = "#607080";
    context.font = "700 16px Manrope";
    context.textAlign = "center";
    context.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function populateSelectFromArray(select, values, selected) {
    select.innerHTML = values
      .map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value)}</option>`)
      .join("");
  }

  function renderOptions(values, selectedValue) {
    return values
      .map((value) => `<option value="${escapeHtml(value)}" ${selectedValue === value ? "selected" : ""}>${escapeHtml(value)}</option>`)
      .join("");
  }

  function uniqueObjects(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (!item.symbol) {
        return false;
      }
      const key = `${item.symbol}|${item.currency}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function fallbackColour(index) {
    return COLOUR_POOL[index % COLOUR_POOL.length];
  }

  function nextAvailableColour() {
    return fallbackColour(state.lines.length);
  }

  function normalizeSymbol(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getMonthOffsetKey(monthKey, offset) {
    const parts = monthKey.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function getUuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `line-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  function formatMoney(value, currency) {
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || "GBP",
        maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
      }).format(value || 0);
    } catch (error) {
      return `${currency || "GBP"} ${Number(value || 0).toFixed(2)}`;
    }
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 6,
    }).format(value || 0);
  }

  function formatInputValue(value) {
    return String(Number(value || 0));
  }

  function formatRate(value) {
    return new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 4,
    }).format(value || 0);
  }

  function formatShortMonth(monthKey) {
    const parts = monthKey.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "2-digit",
    }).format(new Date(parts[0], parts[1] - 1, 1));
  }

  function formatLongMonth(monthKey) {
    const parts = monthKey.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(new Date(parts[0], parts[1] - 1, 1));
  }

  function formatQuoteDate(value) {
    if (!value) {
      return "unknown time";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getChangeClass(change) {
    if (change > 0) {
      return "positive";
    }
    if (change < 0) {
      return "negative";
    }
    return "";
  }

  function getDirectionalChangeClass(kind, change) {
    if (change === null) {
      return "";
    }
    if (kind === "liability") {
      return getChangeClass(change * -1);
    }
    return getChangeClass(change);
  }

  function isIsaType(type) {
    return String(type || "").includes("ISA");
  }

  function getIsaSummary(monthKey) {
    const taxYear = getTaxYearInfo(monthKey);
    const isaLines = getLinesByKind("asset").filter((line) => isIsaType(line.type));
    const lifetimeIsaLines = isaLines.filter((line) => line.type === "Lifetime ISA");
    const missingFxCurrencies = new Set();

    const totalIsaBalanceGbp = isaLines.reduce((sum, line) => {
      return sum + (getLineSnapshot(line, monthKey).gbpValue || 0);
    }, 0);

    const taxYearContributionGbp = taxYear.months.reduce((sum, month) => {
      return sum + isaLines.reduce((lineSum, line) => {
        const nativeAmount = getStoredContributionValue(line.id, month);
        if (!nativeAmount) {
          return lineSum;
        }
        const converted = convertToGbp(nativeAmount, line.currency);
        if (converted === null) {
          missingFxCurrencies.add(line.currency);
          return lineSum;
        }
        return lineSum + converted;
      }, 0);
    }, 0);

    const lifetimeIsaContributionGbp = taxYear.months.reduce((sum, month) => {
      return sum + lifetimeIsaLines.reduce((lineSum, line) => {
        const nativeAmount = getStoredContributionValue(line.id, month);
        if (!nativeAmount) {
          return lineSum;
        }
        const converted = convertToGbp(nativeAmount, line.currency);
        if (converted === null) {
          missingFxCurrencies.add(line.currency);
          return lineSum;
        }
        return lineSum + converted;
      }, 0);
    }, 0);

    return {
      totalIsaBalanceGbp,
      taxYearContributionGbp,
      remainingAllowanceGbp: Math.max(0, ISA_ANNUAL_ALLOWANCE_GBP - taxYearContributionGbp),
      lifetimeIsaContributionGbp,
      remainingLifetimeIsaAllowanceGbp: Math.max(0, LIFETIME_ISA_ALLOWANCE_GBP - lifetimeIsaContributionGbp),
      allowanceUsagePercent: ISA_ANNUAL_ALLOWANCE_GBP === 0 ? 0 : Math.min(100, (taxYearContributionGbp / ISA_ANNUAL_ALLOWANCE_GBP) * 100),
      startLabel: formatLongMonth(taxYear.startMonth),
      deadlineLabel: taxYear.deadlineLabel,
      taxYearMonths: taxYear.months,
      missingFxCurrencies: Array.from(missingFxCurrencies),
    };
  }

  function getTaxYearInfo(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const startYear = month >= 4 ? year : year - 1;
    const startMonth = `${startYear}-04`;
    const months = [];
    let cursor = startMonth;
    while (cursor <= monthKey) {
      months.push(cursor);
      cursor = getMonthOffsetKey(cursor, 1);
    }

    return {
      startMonth,
      months,
      deadlineLabel: `5 April ${startYear + 1}`,
    };
  }

  function isIosSafari() {
    const userAgent = window.navigator.userAgent;
    return /iP(ad|hone|od)/.test(userAgent) && /Safari/.test(userAgent) && !/CriOS|FxiOS/.test(userAgent);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
