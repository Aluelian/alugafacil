const token = localStorage.getItem("token") || "";
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token) {
  window.location.href = "index.html";
}

const profileText = document.getElementById("profileText");
const statusMessage = document.getElementById("statusMessage");
const trendMessage = document.getElementById("trendMessage");

const scope = document.getElementById("scope");
const range = document.getElementById("range");
const statusFilter = document.getElementById("status");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const applyFilters = document.getElementById("applyFilters");
const logoutButton = document.getElementById("logoutButton");
const exportPdfButton = document.getElementById("exportPdfButton");

const kpiRevenue = document.getElementById("kpiRevenue");
const kpiTotal = document.getElementById("kpiTotal");
const kpiTicket = document.getElementById("kpiTicket");
const kpiCancelRate = document.getElementById("kpiCancelRate");
const kpiYoy = document.getElementById("kpiYoy");
const kpiForecast = document.getElementById("kpiForecast");

const chart = document.getElementById("chart");
const heatmap = document.getElementById("heatmap");
const alerts = document.getElementById("alerts");

const goalsForm = document.getElementById("goalsForm");
const goalRevenue = document.getElementById("goalRevenue");
const goalRentals = document.getElementById("goalRentals");
const goalSummary = document.getElementById("goalSummary");
const goalRevenueProgress = document.getElementById("goalRevenueProgress");
const goalRentalsProgress = document.getElementById("goalRentalsProgress");
const goalsHistory = document.getElementById("goalsHistory");

const simulatorForm = document.getElementById("simulatorForm");
const simCancelReduction = document.getElementById("simCancelReduction");
const simTicketIncrease = document.getElementById("simTicketIncrease");
const simSummary = document.getElementById("simSummary");
const forecastSummary = document.getElementById("forecastSummary");

let reportData = null;
let items = [];

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
}

function setTrend(message, type = "") {
  trendMessage.textContent = message;
  trendMessage.className = `status ${type}`.trim();
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Erro na requisicao");
  }

  return data;
}

function reportParams() {
  const params = new URLSearchParams();
  params.set("scope", scope.value);
  params.set("range", range.value);
  params.set("status", statusFilter.value);

  if (fromDate.value) {
    params.set("from", fromDate.value);
  }
  if (toDate.value) {
    params.set("to", toDate.value);
  }

  return params.toString();
}

function monthKeyFromReport(data) {
  if (!data || !data.period) {
    return "global";
  }

  const end = data.period.endDate || new Date().toISOString().slice(0, 10);
  return end.slice(0, 7);
}

async function loadGoals(data) {
  const key = monthKeyFromReport(data);
  const [goalResponse, historyResponse] = await Promise.all([
    api(`/api/goals/${key}`),
    api(`/api/goals/${key}/history`)
  ]);
  const saved = goalResponse.goal;
  const history = historyResponse.history || [];
  if (saved) {
    goalRevenue.value = saved.revenue_goal;
    goalRentals.value = saved.rentals_goal;
  } else {
    goalRevenue.value = "";
    goalRentals.value = "";
  }

  if (!history.length) {
    goalsHistory.innerHTML = "<li>Sem alteracoes registradas para este mes.</li>";
  } else {
    goalsHistory.innerHTML = history
      .slice(0, 6)
      .map((entry) => {
        const when = new Date(entry.changed_at).toLocaleString("pt-BR");
        return `<li>
          <strong>${escapeHtml(when)}</strong><br>
          Receita: ${escapeHtml(formatCurrency(entry.previous_revenue_goal || 0))} → ${escapeHtml(
            formatCurrency(entry.new_revenue_goal)
          )}<br>
          Volume: ${escapeHtml(String(entry.previous_rentals_goal || 0))} → ${escapeHtml(
            String(entry.new_rentals_goal)
          )}
        </li>`;
      })
      .join("");
  }

  return saved;
}

function renderGoals(data, saved) {
  const summary = data.summary || {};
  if (!saved) {
    goalSummary.textContent = "Sem metas salvas para este mes de referencia.";
    goalRevenueProgress.style.width = "0%";
    goalRentalsProgress.style.width = "0%";
    return;
  }

  const revenueGoalValue = Number(saved.revenue_goal);
  const rentalsGoalValue = Number(saved.rentals_goal);

  const revenueProgress = revenueGoalValue > 0
    ? Math.min(100, Math.round((Number(summary.confirmedRevenue || 0) / revenueGoalValue) * 100))
    : 0;

  const rentalsProgress = rentalsGoalValue > 0
    ? Math.min(100, Math.round((Number(summary.totalRentals || 0) / rentalsGoalValue) * 100))
    : 0;

  goalRevenueProgress.style.width = `${revenueProgress}%`;
  goalRentalsProgress.style.width = `${rentalsProgress}%`;
  goalSummary.textContent = `Meta receita: ${formatCurrency(revenueGoalValue)} (${revenueProgress}%) | Meta volume: ${rentalsGoalValue} (${rentalsProgress}%)`;
}

function renderSimulator(data) {
  const summary = data.summary || {};
  const forecasts = (data.comparisons && data.comparisons.forecasts) || {};
  const cancelReduction = Math.max(0, Math.min(100, Number(simCancelReduction.value || 0)));
  const ticketIncrease = Math.max(0, Math.min(100, Number(simTicketIncrease.value || 0)));

  const currentRevenue = Number(summary.confirmedRevenue || 0);
  const avgTicket = Number(summary.avgTicket || 0);
  const cancelled = Number(summary.cancelledRentals || 0);

  const upliftTicketRevenue = currentRevenue * (ticketIncrease / 100);
  const recoveredRentals = cancelled * (cancelReduction / 100);
  const recoveredRevenue = recoveredRentals * avgTicket * (1 + ticketIncrease / 100);
  const projectedRevenue = currentRevenue + upliftTicketRevenue + recoveredRevenue;

  simSummary.textContent = `Receita atual: ${formatCurrency(currentRevenue)}. Cenario projetado: ${formatCurrency(projectedRevenue)} (delta de ${formatCurrency(projectedRevenue - currentRevenue)}).`;
  forecastSummary.textContent = `Previsao base: ${formatCurrency(
    forecasts.simpleAverageNextMonthRevenue || 0
  )} | Ponderada: ${formatCurrency(forecasts.weightedNextMonthRevenue || 0)} | Ajustada: ${formatCurrency(
    forecasts.seasonalAdjustedNextMonthRevenue || 0
  )}`;
}

function renderChart(monthly) {
  if (!monthly || !monthly.length) {
    chart.innerHTML = '<text x="20" y="40" fill="#666" font-size="14">Sem dados para gerar grafico.</text>';
    return;
  }

  const width = 780;
  const height = 300;
  const padX = 60;
  const padY = 30;

  const maxRevenue = Math.max(...monthly.map((m) => Number(m.revenue || 0)), 1);
  const maxRentals = Math.max(...monthly.map((m) => Number(m.total_rentals || 0)), 1);
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const stepX = monthly.length > 1 ? plotW / (monthly.length - 1) : 0;

  const revPoints = monthly.map((m, i) => {
    const x = padX + stepX * i;
    const y = height - padY - (Number(m.revenue || 0) / maxRevenue) * plotH;
    return { x, y, label: m.month, value: Number(m.revenue || 0) };
  });

  const qtyPoints = monthly.map((m, i) => {
    const x = padX + stepX * i;
    const y = height - padY - (Number(m.total_rentals || 0) / maxRentals) * plotH;
    return { x, y, label: m.month, value: Number(m.total_rentals || 0) };
  });

  const revPath = revPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const qtyPath = qtyPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const xLabels = revPoints
    .map((p) => `<text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#576171">${escapeHtml(p.label)}</text>`)
    .join("");

  const revCircles = revPoints
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#1f5f6d"><title>${escapeHtml(p.label)}: ${escapeHtml(formatCurrency(p.value))}</title></circle>`)
    .join("");

  const qtyCircles = qtyPoints
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#7759b6"><title>${escapeHtml(p.label)}: ${escapeHtml(`${p.value} aluguel(is)`)}</title></circle>`)
    .join("");

  chart.innerHTML = `
    <polyline fill="none" stroke="#1f5f6d" stroke-width="3" points="${revPath}" />
    <polyline fill="none" stroke="#7759b6" stroke-width="2.5" stroke-dasharray="5 4" points="${qtyPath}" />
    ${revCircles}
    ${qtyCircles}
    ${xLabels}
    <text x="${padX}" y="18" fill="#1f5f6d" font-size="11">Receita</text>
    <text x="${padX + 70}" y="18" fill="#7759b6" font-size="11">Volume</text>
  `;
}

function renderHeatmap(rentals) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const counts = new Array(7).fill(0);

  (rentals || []).forEach((r) => {
    const d = new Date(r.created_at);
    if (!Number.isNaN(d.getTime())) {
      counts[d.getDay()] += 1;
    }
  });

  const max = Math.max(...counts, 1);
  heatmap.innerHTML = labels
    .map((label, i) => {
      const intensity = (0.15 + (counts[i] / max) * 0.8).toFixed(2);
      return `<article class="heat-cell" style="background: rgba(31,95,109,${intensity})">
        <strong>${label}</strong>
        <span>${counts[i]} aluguel(is)</span>
      </article>`;
    })
    .join("");
}

function renderAlerts(data) {
  const summary = data.summary || {};
  const lowStock = items.filter((item) => Number(item.stock) <= 1).length;
  const out = [];

  if (lowStock > 0) {
    out.push({ type: "warn", title: "Estoque critico", text: `${lowStock} item(ns) em nivel critico.` });
  }
  if (Number(summary.cancellationRate || 0) >= 20) {
    out.push({ type: "danger", title: "Cancelamento alto", text: `${Number(summary.cancellationRate).toFixed(2)}% de cancelamento.` });
  }
  if (Number(summary.avgTicket || 0) >= 150) {
    out.push({ type: "good", title: "Ticket forte", text: `Ticket medio de ${formatCurrency(summary.avgTicket)}.` });
  }
  if (!out.length) {
    out.push({ type: "good", title: "Operacao estavel", text: "Sem alertas criticos neste recorte." });
  }

  alerts.innerHTML = out
    .slice(0, 3)
    .map((a) => `<article class="alert ${a.type}"><strong>${escapeHtml(a.title)}</strong><div>${escapeHtml(a.text)}</div></article>`)
    .join("");
}

function renderKpis(data) {
  const summary = data.summary || {};
  const comparisons = data.comparisons || {};
  const forecasts = comparisons.forecasts || {};
  const yoy = comparisons.yoy || {};
  kpiRevenue.textContent = formatCurrency(summary.confirmedRevenue || 0);
  kpiTotal.textContent = String(summary.totalRentals || 0);
  kpiTicket.textContent = formatCurrency(summary.avgTicket || 0);
  kpiCancelRate.textContent = `${Number(summary.cancellationRate || 0).toFixed(2)}%`;
  kpiForecast.textContent = formatCurrency(forecasts.seasonalAdjustedNextMonthRevenue || 0);

  if (yoy.deltaPercent === null || yoy.deltaPercent === undefined) {
    kpiYoy.textContent = "N/A";
  } else if (Number(yoy.deltaPercent) >= 0) {
    kpiYoy.textContent = `+${Number(yoy.deltaPercent).toFixed(2)}%`;
  } else {
    kpiYoy.textContent = `${Number(yoy.deltaPercent).toFixed(2)}%`;
  }

  const monthly = data.monthly || [];
  if (monthly.length >= 2) {
    const last = Number(monthly[monthly.length - 1].revenue || 0);
    const prev = Number(monthly[monthly.length - 2].revenue || 0);
    const delta = prev === 0 ? 100 : ((last - prev) / prev) * 100;
    if (delta > 0) {
      setTrend(`Tendencia positiva: +${delta.toFixed(1)}% em receita no ultimo mes.`, "success");
    } else if (delta < 0) {
      setTrend(`Atencao: ${delta.toFixed(1)}% em receita no ultimo mes.`, "error");
    } else {
      setTrend("Receita mensal estavel no comparativo mais recente.");
    }
  } else {
    setTrend("Ainda nao ha meses suficientes para comparacao de tendencia.");
  }
}

async function loadData() {
  setStatus("Atualizando BI...", "");
  try {
    const [report, itemsResponse] = await Promise.all([
      api(`/api/rentals/report?${reportParams()}`),
      api("/api/items")
    ]);

    reportData = report;
    items = itemsResponse;

    renderKpis(report);
    renderChart(report.monthly || []);
    renderHeatmap(report.rentals || []);
    renderAlerts(report);
    const savedGoal = await loadGoals(report);
    renderGoals(report, savedGoal);
    renderSimulator(report);

    setStatus("BI atualizado com sucesso.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

applyFilters.addEventListener("click", async () => {
  await loadData();
});

goalsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!reportData) {
    return;
  }

  const revenueGoal = Number(goalRevenue.value || 0);
  const rentalsGoal = Number(goalRentals.value || 0);
  const key = monthKeyFromReport(reportData);

  try {
    const result = await api(`/api/goals/${key}`, {
      method: "PUT",
      body: JSON.stringify({ revenueGoal, rentalsGoal })
    });
    renderGoals(reportData, result.goal);
    setStatus("Metas salvas com sucesso no banco de dados.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

simulatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!reportData) {
    return;
  }

  renderSimulator(reportData);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

exportPdfButton.addEventListener("click", () => {
  if (!reportData) {
    setStatus("Carregue um relatorio antes de exportar PDF.", "error");
    return;
  }

  const summary = reportData.summary || {};
  const comparisons = reportData.comparisons || {};
  const forecasts = comparisons.forecasts || {};
  const yoy = comparisons.yoy || {};
  const opened = window.open("", "_blank", "width=1080,height=820");

  if (!opened) {
    setStatus("Nao foi possivel abrir a janela de impressao. Verifique bloqueador de pop-up.", "error");
    return;
  }

  const monthRows = (reportData.monthly || [])
    .map((m) => `<tr><td>${escapeHtml(m.month)}</td><td>${escapeHtml(String(m.total_rentals))}</td><td>${escapeHtml(formatCurrency(m.revenue))}</td></tr>`)
    .join("");

  opened.document.write(`
    <html>
      <head>
        <title>Relatorio Executivo - AlugaFacil</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #1b1f24; }
          h1 { margin: 0 0 8px; }
          .muted { color: #5f6973; margin-bottom: 18px; }
          .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
          .kpis article { border: 1px solid #d6d0c2; border-radius: 8px; padding: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d6d0c2; padding: 8px; text-align: left; }
          th { background: #f4efe6; }
        </style>
      </head>
      <body>
        <h1>Relatorio Executivo - AlugaFacil</h1>
        <p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</p>

        <section class="kpis">
          <article><strong>Receita</strong><div>${formatCurrency(summary.confirmedRevenue || 0)}</div></article>
          <article><strong>Total de alugueis</strong><div>${summary.totalRentals || 0}</div></article>
          <article><strong>Ticket medio</strong><div>${formatCurrency(summary.avgTicket || 0)}</div></article>
          <article><strong>Cancelamento</strong><div>${Number(summary.cancellationRate || 0).toFixed(2)}%</div></article>
          <article><strong>YoY</strong><div>${yoy.deltaPercent === null || yoy.deltaPercent === undefined ? "N/A" : `${Number(yoy.deltaPercent).toFixed(2)}%`}</div></article>
          <article><strong>Previsao proximo mes</strong><div>${formatCurrency(forecasts.seasonalAdjustedNextMonthRevenue || 0)}</div></article>
        </section>

        <p><strong>Modelos de previsao:</strong> Simples ${formatCurrency(
          forecasts.simpleAverageNextMonthRevenue || 0
        )} | Ponderada ${formatCurrency(forecasts.weightedNextMonthRevenue || 0)} | Ajustada ${formatCurrency(
          forecasts.seasonalAdjustedNextMonthRevenue || 0
        )}</p>

        <h2>Evolucao mensal</h2>
        <table>
          <thead><tr><th>Mes</th><th>Alugueis</th><th>Receita</th></tr></thead>
          <tbody>${monthRows || "<tr><td colspan='3'>Sem dados</td></tr>"}</tbody>
        </table>
      </body>
    </html>
  `);
  opened.document.close();
  opened.focus();
  opened.print();
});

(async function bootstrap() {
  if (!user) {
    try {
      const me = await api("/api/auth/me");
      profileText.textContent = `${me.user.name} (${me.user.role === "admin" ? "Administrador" : "Cliente"})`;
      if (me.user.role !== "admin") {
        scope.value = "mine";
        const allOption = scope.querySelector('option[value="all"]');
        if (allOption) {
          allOption.disabled = true;
        }
      }
    } catch (_error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      return;
    }
  } else {
    profileText.textContent = `${user.name} (${user.role === "admin" ? "Administrador" : "Cliente"})`;
    if (user.role !== "admin") {
      scope.value = "mine";
      const allOption = scope.querySelector('option[value="all"]');
      if (allOption) {
        allOption.disabled = true;
      }
    }
  }

  await loadData();
})();
