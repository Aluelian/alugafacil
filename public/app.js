const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  items: [],
  rentals: [],
  reportData: null
};

const authPanel = document.querySelector(".auth-panel");
const dashboardPanel = document.querySelector(".dashboard-panel");

const authStatus = document.getElementById("authStatus");
const dashboardStatus = document.getElementById("dashboardStatus");
const itemsList = document.getElementById("itemsList");
const rentalsList = document.getElementById("rentalsList");
const itemIdSelect = document.getElementById("itemIdSelect");
const welcomeText = document.getElementById("welcomeText");
const kpiItems = document.getElementById("kpiItems");
const kpiActiveRentals = document.getElementById("kpiActiveRentals");
const kpiTotalValue = document.getElementById("kpiTotalValue");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const onboardingList = document.getElementById("onboardingList");
const adminPanel = document.getElementById("adminPanel");
const adminStatus = document.getElementById("adminStatus");
const adminItemForm = document.getElementById("adminItemForm");
const adminItemId = document.getElementById("adminItemId");
const adminItemName = document.getElementById("adminItemName");
const adminItemDescription = document.getElementById("adminItemDescription");
const adminItemDailyRate = document.getElementById("adminItemDailyRate");
const adminItemStock = document.getElementById("adminItemStock");
const adminSaveButton = document.getElementById("adminSaveButton");
const adminCancelEditButton = document.getElementById("adminCancelEditButton");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const rentalForm = document.getElementById("rentalForm");
const logoutButton = document.getElementById("logoutButton");
const createRentalButton = document.getElementById("createRentalButton");
const filterStatus = document.getElementById("filterStatus");
const filterSearch = document.getElementById("filterSearch");
const filterStartDate = document.getElementById("filterStartDate");
const filterEndDate = document.getElementById("filterEndDate");
const clearFiltersButton = document.getElementById("clearFiltersButton");
const exportCsvButton = document.getElementById("exportCsvButton");
const reportRevenue = document.getElementById("reportRevenue");
const reportCancelRate = document.getElementById("reportCancelRate");
const reportTopItem = document.getElementById("reportTopItem");
const reportTopItemsList = document.getElementById("reportTopItemsList");
const reportScope = document.getElementById("reportScope");
const reportRange = document.getElementById("reportRange");
const reportStatusFilter = document.getElementById("reportStatus");
const reportFrom = document.getElementById("reportFrom");
const reportTo = document.getElementById("reportTo");
const applyReportFiltersButton = document.getElementById("applyReportFiltersButton");
const exportReportCsvButton = document.getElementById("exportReportCsvButton");
const reportStatusMessage = document.getElementById("reportStatusMessage");
const reportMonthlyList = document.getElementById("reportMonthlyList");
const reportTrendMessage = document.getElementById("reportTrendMessage");
const reportAlerts = document.getElementById("reportAlerts");
const monthlyRevenueChart = document.getElementById("monthlyRevenueChart");
const weekdayHeatmap = document.getElementById("weekdayHeatmap");
const healthScoreCard = document.getElementById("healthScoreCard");
const healthScoreValue = document.getElementById("healthScoreValue");
const healthScoreReason = document.getElementById("healthScoreReason");
const rangeChips = Array.from(document.querySelectorAll(".range-chip"));

function isAdmin() {
  return state.user && state.user.role === "admin";
}

function setAdminPanelVisibility() {
  const visible = isAdmin();
  adminPanel.style.display = visible ? "block" : "none";
  adminPanel.setAttribute("aria-hidden", visible ? "false" : "true");

  if (!visible) {
    reportScope.value = "mine";
    const allOption = reportScope.querySelector('option[value="all"]');
    if (allOption) {
      allOption.disabled = true;
    }
  } else {
    const allOption = reportScope.querySelector('option[value="all"]');
    if (allOption) {
      allOption.disabled = false;
    }
  }
}

function resetAdminForm() {
  adminItemId.value = "";
  adminItemName.value = "";
  adminItemDescription.value = "";
  adminItemDailyRate.value = "";
  adminItemStock.value = "0";
  adminSaveButton.textContent = "Salvar item";
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`.trim();
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function statusLabel(status) {
  if (status === "active") {
    return "Em andamento";
  }
  if (status === "cancelled") {
    return "Cancelado";
  }
  return "Finalizado";
}

function updateProfileCard() {
  if (!state.user) {
    profileAvatar.textContent = "--";
    profileName.textContent = "Visitante";
    profileEmail.textContent = "Sem sessao ativa";
    return;
  }

  const name = state.user.name || "Usuario";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join("");

  profileAvatar.textContent = initials || "U";
  profileName.textContent = name;
  profileEmail.textContent = `${state.user.email || "Email nao informado"} | ${
    state.user.role === "admin" ? "Administrador" : "Cliente"
  }`;
}

function updateOnboarding() {
  const hasItems = state.items.length > 0;
  const hasRental = state.rentals.length > 0;
  const hasActiveRental = state.rentals.some((rental) => rental.status === "active");

  const steps = [
    { done: hasItems, text: "1. Explore os itens disponiveis" },
    { done: hasRental, text: "2. Crie seu primeiro aluguel" },
    { done: hasActiveRental, text: "3. Acompanhe um aluguel em andamento" },
    { done: !isAdmin() || state.items.length > 0, text: "4. (Admin) Gerencie o catalogo de itens" }
  ];

  onboardingList.innerHTML = "";
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.className = `onboarding-item ${step.done ? "done" : ""}`.trim();
    li.textContent = `${step.done ? "[ok]" : "[ ]"} ${step.text}`;
    onboardingList.appendChild(li);
  });
}

function updateKpis(rentals = []) {
  kpiItems.textContent = String(state.items.reduce((total, item) => total + item.stock, 0));
  kpiActiveRentals.textContent = String(rentals.filter((rental) => rental.status === "active").length);
  kpiTotalValue.textContent = formatCurrency(
    rentals.reduce((sum, rental) => sum + Number(rental.total_price || 0), 0)
  );
}

function applyRentalFilters() {
  const status = filterStatus.value;
  const search = filterSearch.value.trim().toLowerCase();
  const start = filterStartDate.value;
  const end = filterEndDate.value;

  return state.rentals.filter((rental) => {
    if (status !== "all" && rental.status !== status) {
      return false;
    }

    if (search && !String(rental.item_name || "").toLowerCase().includes(search)) {
      return false;
    }

    if (start && rental.start_date < start) {
      return false;
    }

    if (end && rental.end_date > end) {
      return false;
    }

    return true;
  });
}

function getCurrentFilteredRentals() {
  return applyRentalFilters();
}

function syncRangeChips() {
  rangeChips.forEach((chip) => {
    const active = chip.dataset.range === reportRange.value;
    chip.classList.toggle("active", active);
  });
}

function formatMonthLabel(monthText) {
  const [year, month] = String(monthText || "").split("-");
  if (!year || !month) {
    return monthText;
  }

  const monthDate = new Date(Number(year), Number(month) - 1, 1);
  return monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMonthlyChart(monthly) {
  if (!monthly || !monthly.length) {
    monthlyRevenueChart.innerHTML = '<text x="20" y="36" fill="#6c6c6c" font-size="14">Sem dados de evolucao mensal para exibir.</text>';
    return;
  }

  const width = 680;
  const height = 260;
  const padX = 56;
  const padY = 26;

  const maxRevenue = Math.max(...monthly.map((m) => Number(m.revenue || 0)), 1);
  const maxRentals = Math.max(...monthly.map((m) => Number(m.total_rentals || 0)), 1);
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  const stepX = monthly.length > 1 ? plotWidth / (monthly.length - 1) : 0;

  const revenuePoints = monthly.map((entry, index) => {
    const revenue = Number(entry.revenue || 0);
    const x = padX + stepX * index;
    const y = height - padY - (revenue / maxRevenue) * plotHeight;
    return { x, y, revenue, label: formatMonthLabel(entry.month) };
  });

  const rentalsPoints = monthly.map((entry, index) => {
    const rentals = Number(entry.total_rentals || 0);
    const x = padX + stepX * index;
    const y = height - padY - (rentals / maxRentals) * plotHeight;
    return { x, y, rentals, label: formatMonthLabel(entry.month) };
  });

  const revenuePolyline = revenuePoints.map((p) => `${p.x},${p.y}`).join(" ");
  const rentalsPolyline = rentalsPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = maxRevenue * ratio;
    const y = height - padY - ratio * plotHeight;
    return { y, label: formatCurrency(value) };
  });

  const yRightTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(maxRentals * ratio);
    const y = height - padY - ratio * plotHeight;
    return { y, label: `${value}` };
  });

  const xLabels = revenuePoints
    .map((p) => `<text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#5b6169">${escapeHtml(p.label)}</text>`)
    .join("");

  const revenueCircles = revenuePoints
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#2f7d32"><title>${escapeHtml(p.label)}: ${escapeHtml(
          formatCurrency(p.revenue)
        )}</title></circle>`
    )
    .join("");

  const rentalsCircles = rentalsPoints
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#375f88"><title>${escapeHtml(p.label)}: ${escapeHtml(
          `${p.rentals} aluguel(is)`
        )}</title></circle>`
    )
    .join("");

  const gridLines = yTicks
    .map(
      (tick) =>
        `<line x1="${padX}" y1="${tick.y}" x2="${width - padX}" y2="${tick.y}" stroke="#ece1d2" stroke-width="1" />
         <text x="8" y="${tick.y + 4}" font-size="10" fill="#6a6f75">${escapeHtml(tick.label)}</text>`
    )
    .join("");

  const rightScale = yRightTicks
    .map(
      (tick) =>
        `<text x="${width - 12}" y="${tick.y + 4}" text-anchor="end" font-size="10" fill="#587092">${escapeHtml(
          tick.label
        )}</text>`
    )
    .join("");

  monthlyRevenueChart.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${gridLines}
    <polyline fill="none" stroke="#2f7d32" stroke-width="3" points="${revenuePolyline}" />
    <polyline fill="none" stroke="#375f88" stroke-width="2.5" stroke-dasharray="5 4" points="${rentalsPolyline}" />
    ${revenueCircles}
    ${rentalsCircles}
    ${xLabels}
    ${rightScale}
    <text x="${padX}" y="16" font-size="11" fill="#2f7d32">Receita</text>
    <text x="${padX + 66}" y="16" font-size="11" fill="#375f88">Volume</text>
  `;
}

function renderWeekdayHeatmap(rentals) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const counts = new Array(7).fill(0);

  (rentals || []).forEach((rental) => {
    const date = new Date(rental.created_at);
    if (!Number.isNaN(date.getTime())) {
      counts[date.getDay()] += 1;
    }
  });

  const max = Math.max(...counts, 1);
  weekdayHeatmap.innerHTML = labels
    .map((label, index) => {
      const intensity = counts[index] / max;
      const alpha = (0.15 + intensity * 0.75).toFixed(2);
      return `<article class="heat-cell" style="background: rgba(55, 95, 136, ${alpha})">
        <strong>${label}</strong>
        <span>${counts[index]} aluguel(is)</span>
      </article>`;
    })
    .join("");
}

function renderHealthScore(data) {
  const summary = data.summary || {};
  const cancellationRate = Number(summary.cancellationRate || 0);
  const avgTicket = Number(summary.avgTicket || 0);
  const activeRentals = Number(summary.activeRentals || 0);
  const lowStockItems = state.items.filter((item) => Number(item.stock) <= 1).length;

  let score = 100;
  score -= Math.min(40, cancellationRate * 1.2);
  score -= Math.min(25, lowStockItems * 6);
  if (activeRentals === 0) {
    score -= 10;
  }
  if (avgTicket >= 150) {
    score += 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  healthScoreValue.textContent = `${score}/100`;

  healthScoreCard.classList.remove("good", "warn", "danger");
  if (score >= 80) {
    healthScoreCard.classList.add("good");
    healthScoreReason.textContent =
      "Operacao forte: taxa de cancelamento controlada e boa eficiencia comercial.";
  } else if (score >= 55) {
    healthScoreCard.classList.add("warn");
    healthScoreReason.textContent =
      "Operacao estavel com pontos de atencao. Revise cancelamentos e estoque critico.";
  } else {
    healthScoreCard.classList.add("danger");
    healthScoreReason.textContent =
      "Risco operacional alto. Priorize ajuste de estoque e reducao de cancelamentos.";
  }
}

function renderReportAlerts(data) {
  const summary = data.summary || {};
  const alerts = [];
  const lowStockItems = state.items.filter((item) => Number(item.stock) <= 1).length;

  if (lowStockItems > 0) {
    alerts.push({
      type: "warn",
      title: "Estoque critico",
      message: `${lowStockItems} item(ns) com estoque igual ou abaixo de 1 unidade.`
    });
  }

  if (Number(summary.cancellationRate || 0) >= 20) {
    alerts.push({
      type: "danger",
      title: "Cancelamento alto",
      message: `Taxa de cancelamento em ${Number(summary.cancellationRate).toFixed(2)}%. Avalie politica de reserva.`
    });
  }

  if ((summary.totalRentals || 0) >= 1 && Number(summary.avgTicket || 0) >= 150) {
    alerts.push({
      type: "good",
      title: "Ticket medio forte",
      message: `Ticket medio atual em ${formatCurrency(summary.avgTicket)}.`
    });
  }

  if ((summary.activeRentals || 0) > 0 && lowStockItems === 0) {
    alerts.push({
      type: "good",
      title: "Operacao saudavel",
      message: "Existem alugueis ativos e o estoque segue em nivel seguro."
    });
  }

  if (!alerts.length) {
    alerts.push({
      type: "good",
      title: "Sem alertas criticos",
      message: "A operacao esta estavel neste recorte de relatorio."
    });
  }

  reportAlerts.innerHTML = alerts
    .slice(0, 3)
    .map(
      (alert) =>
        `<article class="alert-card ${alert.type}"><strong>${escapeHtml(alert.title)}</strong><span>${escapeHtml(
          alert.message
        )}</span></article>`
    )
    .join("");
}

function renderTrend(data) {
  const monthly = data.monthly || [];
  if (monthly.length < 2) {
    setStatus(reportTrendMessage, "Ainda nao ha meses suficientes para comparar tendencia.", "");
    return;
  }

  const last = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const lastRevenue = Number(last.revenue || 0);
  const prevRevenue = Number(prev.revenue || 0);
  const delta = lastRevenue - prevRevenue;
  const deltaPercent = prevRevenue === 0 ? 100 : (delta / prevRevenue) * 100;

  if (delta > 0) {
    setStatus(
      reportTrendMessage,
      `Tendencia positiva: ${formatMonthLabel(last.month)} subiu ${deltaPercent.toFixed(1)}% vs ${formatMonthLabel(prev.month)}.`,
      "success"
    );
  } else if (delta < 0) {
    setStatus(
      reportTrendMessage,
      `Atencao: ${formatMonthLabel(last.month)} caiu ${Math.abs(deltaPercent).toFixed(1)}% vs ${formatMonthLabel(prev.month)}.`,
      "error"
    );
  } else {
    setStatus(reportTrendMessage, "Receita mensal estavel no comparativo recente.", "");
  }
}

function toCsvValue(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function renderReports(filteredRentals) {
  const total = filteredRentals.length;
  const cancelled = filteredRentals.filter((rental) => rental.status === "cancelled").length;
  const confirmedRevenue = filteredRentals
    .filter((rental) => rental.status === "active" || rental.status === "finished")
    .reduce((sum, rental) => sum + Number(rental.total_price || 0), 0);

  const cancelRate = total === 0 ? 0 : Math.round((cancelled / total) * 100);
  reportRevenue.textContent = formatCurrency(confirmedRevenue);
  reportCancelRate.textContent = `${cancelRate}%`;

  const byItem = new Map();
  filteredRentals.forEach((rental) => {
    const current = byItem.get(rental.item_name) || { count: 0, value: 0 };
    byItem.set(rental.item_name, {
      count: current.count + Number(rental.quantity || 0),
      value: current.value + Number(rental.total_price || 0)
    });
  });

  const sortedItems = [...byItem.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  reportTopItem.textContent = sortedItems[0] ? sortedItems[0].name : "-";
  reportTopItemsList.innerHTML = "";

  if (!sortedItems.length) {
    reportTopItemsList.innerHTML = "<li>Sem dados para os filtros selecionados.</li>";
    return;
  }

  const topCount = sortedItems[0].count || 1;
  sortedItems.slice(0, 5).forEach((item) => {
    const percent = Math.round((item.count / topCount) * 100);
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-title">${item.name}</div>
      <div class="item-meta">${item.count} unidade(s) alugadas | ${formatCurrency(item.value)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
    `;
    reportTopItemsList.appendChild(li);
  });

  reportMonthlyList.innerHTML = "<li>Use os filtros de relatorio para ver a evolucao mensal.</li>";
  monthlyRevenueChart.innerHTML = '<text x="20" y="36" fill="#6c6c6c" font-size="14">Aplique o relatorio para visualizar o grafico mensal.</text>';
  weekdayHeatmap.innerHTML = "";
  healthScoreCard.classList.remove("good", "warn", "danger");
  healthScoreValue.textContent = "0/100";
  healthScoreReason.textContent = "Aguardando dados para analise.";
  reportAlerts.innerHTML = "";
  setStatus(reportTrendMessage, "", "");
}

function renderAdvancedReport(data) {
  const summary = data.summary || {};
  reportRevenue.textContent = formatCurrency(summary.confirmedRevenue || 0);
  reportCancelRate.textContent = `${Number(summary.cancellationRate || 0).toFixed(2)}%`;

  reportTopItem.textContent = data.topItems && data.topItems[0] ? data.topItems[0].item_name : "-";

  reportTopItemsList.innerHTML = "";
  const topItems = data.topItems || [];
  if (!topItems.length) {
    reportTopItemsList.innerHTML = "<li>Sem dados no periodo selecionado.</li>";
  } else {
    const topBase = Number(topItems[0].quantity || 1);
    topItems.slice(0, 5).forEach((item) => {
      const percent = Math.round((Number(item.quantity || 0) / topBase) * 100);
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="item-title">${item.item_name}</div>
        <div class="item-meta">${item.quantity} unidade(s) | ${formatCurrency(item.revenue)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      `;
      reportTopItemsList.appendChild(li);
    });
  }

  reportMonthlyList.innerHTML = "";
  const monthly = data.monthly || [];
  if (!monthly.length) {
    reportMonthlyList.innerHTML = "<li>Sem evolucao mensal para o periodo selecionado.</li>";
  } else {
    monthly.forEach((month) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="month-row">
          <strong>${formatMonthLabel(month.month)}</strong>
          <span>${month.total_rentals} aluguel(is)</span>
          <span>${formatCurrency(month.revenue)}</span>
        </div>
      `;
      reportMonthlyList.appendChild(li);
    });
  }

  renderMonthlyChart(monthly);
  renderWeekdayHeatmap(data.rentals || []);
  renderHealthScore(data);
  renderReportAlerts(data);
  renderTrend(data);
}

function buildReportQueryParams() {
  const params = new URLSearchParams();
  params.set("scope", reportScope.value);
  params.set("range", reportRange.value);
  params.set("status", reportStatusFilter.value);

  if (reportFrom.value) {
    params.set("from", reportFrom.value);
  }

  if (reportTo.value) {
    params.set("to", reportTo.value);
  }

  return params.toString();
}

async function loadAdvancedReport() {
  if (!state.token) {
    state.reportData = null;
    return;
  }

  setStatus(reportStatusMessage, "Atualizando relatorio...", "loading");
  syncRangeChips();

  try {
    const query = buildReportQueryParams();
    const data = await api(`/api/rentals/report?${query}`);
    state.reportData = data;
    renderAdvancedReport(data);
    setStatus(reportStatusMessage, "Relatorio atualizado com sucesso.", "success");
  } catch (error) {
    setStatus(reportStatusMessage, error.message, "error");
  }
}

function rentalProgressPercent(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date();

  if (now <= start) {
    return 0;
  }
  if (now >= end) {
    return 100;
  }

  const full = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / full) * 100)));
}

function fillAdminForm(item) {
  adminItemId.value = String(item.id);
  adminItemName.value = item.name;
  adminItemDescription.value = item.description || "";
  adminItemDailyRate.value = Number(item.daily_rate).toFixed(2);
  adminItemStock.value = String(item.stock);
  adminSaveButton.textContent = "Atualizar item";
  adminItemName.focus();
}

async function removeItem(itemId) {
  const confirmed = window.confirm("Deseja remover este item? Essa acao nao pode ser desfeita.");
  if (!confirmed) {
    return;
  }

  try {
    await api(`/api/items/${itemId}`, { method: "DELETE" });
    setStatus(adminStatus, "Item removido com sucesso.", "success");
    await loadItems();
  } catch (error) {
    setStatus(adminStatus, error.message, "error");
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Erro na requisicao");
  }

  return data;
}

function togglePanels(isLoggedIn) {
  authPanel.style.display = isLoggedIn ? "none" : "block";
  dashboardPanel.style.display = isLoggedIn ? "block" : "none";
}

function renderItems(items) {
  itemsList.innerHTML = "";
  itemIdSelect.innerHTML = "";

  if (!items.length) {
    itemsList.innerHTML = "<li>Nenhum item disponivel no momento.</li>";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-title">${item.name}</div>
      <div class="item-description">${item.description || "Sem descricao"}</div>
      <div class="item-meta">Diaria: ${formatCurrency(item.daily_rate)} | Estoque atual: ${item.stock}</div>
    `;

    if (isAdmin()) {
      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "btn-secondary";
      editButton.textContent = "Editar";
      editButton.addEventListener("click", () => fillAdminForm(item));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn-danger";
      deleteButton.textContent = "Remover";
      deleteButton.addEventListener("click", () => removeItem(item.id));

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      li.appendChild(actions);
    }

    itemsList.appendChild(li);

    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} - ${formatCurrency(item.daily_rate)} por dia`;
    itemIdSelect.appendChild(option);
  });
}

function renderRentals(rentals) {
  rentalsList.innerHTML = "";
  updateKpis(state.rentals);
  updateOnboarding();
  renderReports(rentals);

  if (!rentals.length) {
    rentalsList.innerHTML = "<li>Nenhum aluguel encontrado com os filtros atuais.</li>";
    return;
  }

  rentals.forEach((rental) => {
    const li = document.createElement("li");
    const progress = rentalProgressPercent(rental.start_date, rental.end_date);
    li.innerHTML = `
      <div class="item-title">${rental.item_name}</div>
      <div class="item-meta">Quantidade: ${rental.quantity} unidade(s)</div>
      <div class="item-meta">Periodo: ${formatDate(rental.start_date)} ate ${formatDate(rental.end_date)}</div>
      <div class="item-meta">Total: ${formatCurrency(rental.total_price)}</div>
      <span class="pill ${rental.status}">${statusLabel(rental.status)}</span>
      <div class="rental-progress"><span style="width: ${rental.status === "active" ? progress : 100}%"></span></div>
      <div class="item-meta">Progresso do periodo: ${rental.status === "active" ? `${progress}%` : "100%"}</div>
    `;

    if (rental.status === "active") {
      const finishButton = document.createElement("button");
      finishButton.className = "inline-action btn-secondary";
      finishButton.textContent = "Finalizar agora";
      finishButton.addEventListener("click", async () => {
        const confirmed = window.confirm("Confirmar devolucao e finalizar este aluguel?");
        if (!confirmed) {
          return;
        }

        try {
          await api(`/api/rentals/${rental.id}/finish`, { method: "PATCH" });
          setStatus(dashboardStatus, "Aluguel finalizado e estoque devolvido com sucesso.", "success");
          await loadRentals();
          await loadItems();
        } catch (error) {
          setStatus(dashboardStatus, error.message, "error");
        }
      });
      li.appendChild(finishButton);

      const cancelButton = document.createElement("button");
      cancelButton.className = "inline-action";
      cancelButton.textContent = "Cancelar aluguel";
      cancelButton.addEventListener("click", async () => {
        const confirmed = window.confirm("Deseja realmente cancelar este aluguel?");
        if (!confirmed) {
          return;
        }

        try {
          await api(`/api/rentals/${rental.id}/cancel`, { method: "PATCH" });
          setStatus(dashboardStatus, "Aluguel cancelado e estoque atualizado com sucesso.", "success");
          await loadRentals();
          await loadItems();
        } catch (error) {
          setStatus(dashboardStatus, error.message, "error");
        }
      });
      li.appendChild(cancelButton);
    }

    rentalsList.appendChild(li);
  });
}

async function loadItems() {
  try {
    const items = await api("/api/items");
    state.items = items;
    renderItems(items);
    updateKpis(state.rentals);
    updateOnboarding();
  } catch (error) {
    setStatus(dashboardStatus, error.message, "error");
  }
}

async function loadRentals() {
  try {
    const rentals = await api("/api/rentals/my");
    state.rentals = rentals;
    renderRentals(applyRentalFilters());
  } catch (error) {
    setStatus(dashboardStatus, error.message, "error");
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    registerForm.reset();
    setStatus(authStatus, "Conta criada com sucesso. Agora faca login para continuar.", "success");
  } catch (error) {
    setStatus(authStatus, error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));
    togglePanels(true);
    updateProfileCard();
    setAdminPanelVisibility();
    resetAdminForm();
    setStatus(authStatus, "Login realizado com sucesso.", "success");
    welcomeText.textContent = `Bem-vindo, ${data.user.name}. Aqui voce gerencia seus alugueis em tempo real.`;
    setStatus(dashboardStatus, "Tudo pronto. Escolha um item e crie seu aluguel.", "success");

    await loadItems();
    await loadRentals();
    await loadAdvancedReport();
  } catch (error) {
    setStatus(authStatus, error.message, "error");
  }
});

rentalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(rentalForm);

  createRentalButton.disabled = true;
  createRentalButton.textContent = "Criando aluguel...";
  setStatus(dashboardStatus, "Processando seu aluguel...", "loading");

  try {
    await api("/api/rentals", {
      method: "POST",
      body: JSON.stringify({
        itemId: Number(formData.get("itemId")),
        quantity: Number(formData.get("quantity")),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate")
      })
    });

    rentalForm.reset();
    setStatus(dashboardStatus, "Aluguel criado com sucesso. Seu pedido ja esta ativo.", "success");
    await loadItems();
    await loadRentals();
  } catch (error) {
    setStatus(dashboardStatus, error.message, "error");
  } finally {
    createRentalButton.disabled = false;
    createRentalButton.textContent = "Criar aluguel";
  }
});

logoutButton.addEventListener("click", () => {
  state.token = "";
  state.user = null;
  state.rentals = [];
  state.items = [];
  state.reportData = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  togglePanels(false);
  updateProfileCard();
  setAdminPanelVisibility();
  resetAdminForm();
  updateOnboarding();
  welcomeText.textContent = "";
  setStatus(authStatus, "Sessao encerrada. Ate a proxima.", "success");
  setStatus(reportStatusMessage, "", "");
  reportMonthlyList.innerHTML = "";
  reportTopItemsList.innerHTML = "";
});

[filterStatus, filterSearch, filterStartDate, filterEndDate].forEach((element) => {
  element.addEventListener("input", () => {
    renderRentals(getCurrentFilteredRentals());
  });
});

clearFiltersButton.addEventListener("click", () => {
  filterStatus.value = "all";
  filterSearch.value = "";
  filterStartDate.value = "";
  filterEndDate.value = "";
  renderRentals(getCurrentFilteredRentals());
});

exportCsvButton.addEventListener("click", () => {
  const rentals = getCurrentFilteredRentals();
  if (!rentals.length) {
    setStatus(dashboardStatus, "Nao ha alugueis para exportar com os filtros atuais.", "error");
    return;
  }

  const header = [
    "id",
    "item",
    "quantidade",
    "data_inicio",
    "data_fim",
    "total",
    "status",
    "criado_em"
  ];

  const rows = rentals.map((rental) => [
    rental.id,
    rental.item_name,
    rental.quantity,
    rental.start_date,
    rental.end_date,
    rental.total_price,
    rental.status,
    rental.created_at
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(toCsvValue).join(";"))
    .join("\n");

  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsv(`alugueis-${dateTag}.csv`, csv);
  setStatus(dashboardStatus, "Exportacao concluida com sucesso.", "success");
});

applyReportFiltersButton.addEventListener("click", async () => {
  await loadAdvancedReport();
});

rangeChips.forEach((chip) => {
  chip.addEventListener("click", async () => {
    reportRange.value = chip.dataset.range;
    reportFrom.value = "";
    reportTo.value = "";
    syncRangeChips();
    await loadAdvancedReport();
  });
});

[reportScope, reportRange, reportStatusFilter].forEach((element) => {
  element.addEventListener("change", () => {
    syncRangeChips();
  });
});

[reportFrom, reportTo].forEach((element) => {
  element.addEventListener("change", () => {
    if (reportFrom.value || reportTo.value) {
      reportRange.value = "all";
      syncRangeChips();
    }
  });
});

exportReportCsvButton.addEventListener("click", () => {
  const rentals = state.reportData && state.reportData.rentals ? state.reportData.rentals : [];
  if (!rentals.length) {
    setStatus(reportStatusMessage, "Nao ha dados no relatorio atual para exportar.", "error");
    return;
  }

  const header = [
    "id",
    "usuario",
    "item",
    "quantidade",
    "data_inicio",
    "data_fim",
    "total",
    "status",
    "criado_em"
  ];

  const rows = rentals.map((rental) => [
    rental.id,
    rental.user_name,
    rental.item_name,
    rental.quantity,
    rental.start_date,
    rental.end_date,
    rental.total_price,
    rental.status,
    rental.created_at
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(toCsvValue).join(";"))
    .join("\n");

  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsv(`relatorio-alugueis-${dateTag}.csv`, csv);
  setStatus(reportStatusMessage, "CSV do relatorio exportado com sucesso.", "success");
});

adminItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin()) {
    setStatus(adminStatus, "Apenas administradores podem gerenciar itens.", "error");
    return;
  }

  const payload = {
    name: adminItemName.value.trim(),
    description: adminItemDescription.value.trim(),
    dailyRate: Number(adminItemDailyRate.value),
    stock: Number(adminItemStock.value)
  };

  const editingId = adminItemId.value;
  const isEditing = Boolean(editingId);

  adminSaveButton.disabled = true;
  adminSaveButton.textContent = isEditing ? "Atualizando..." : "Salvando...";

  try {
    if (isEditing) {
      await api(`/api/items/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setStatus(adminStatus, "Item atualizado com sucesso.", "success");
    } else {
      await api("/api/items", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setStatus(adminStatus, "Novo item cadastrado com sucesso.", "success");
    }

    resetAdminForm();
    await loadItems();
  } catch (error) {
    setStatus(adminStatus, error.message, "error");
  } finally {
    adminSaveButton.disabled = false;
    adminSaveButton.textContent = "Salvar item";
  }
});

adminCancelEditButton.addEventListener("click", () => {
  resetAdminForm();
  setStatus(adminStatus, "Edicao cancelada.", "success");
});

(async function bootstrap() {
  const today = new Date().toISOString().slice(0, 10);
  rentalForm.startDate.value = today;
  rentalForm.endDate.value = today;
  updateProfileCard();
  updateOnboarding();
  setAdminPanelVisibility();
  syncRangeChips();

  if (state.token) {
    togglePanels(true);

    if (!state.user || !state.user.role) {
      try {
        const meData = await api("/api/auth/me");
        state.user = meData.user;
        localStorage.setItem("user", JSON.stringify(state.user));
        updateProfileCard();
        setAdminPanelVisibility();
      } catch (error) {
        state.token = "";
        state.user = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        togglePanels(false);
        setStatus(authStatus, "Sua sessao expirou. Faca login novamente.", "error");
        return;
      }
    }

    welcomeText.textContent = state.user
      ? `Sessao restaurada, ${state.user.name}. Continue de onde parou.`
      : "Sessao restaurada. Continue de onde parou.";
    await loadItems();
    await loadRentals();
    await loadAdvancedReport();
  } else {
    togglePanels(false);
  }
})();
