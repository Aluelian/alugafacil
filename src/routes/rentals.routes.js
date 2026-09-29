const express = require("express");
const { all, get, run } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function parseDate(dateText) {
  const date = new Date(dateText);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateDays(start, end) {
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
}

function getRangeStart(range) {
  const now = new Date();
  const date = new Date(now);

  if (range === "7d") {
    date.setDate(now.getDate() - 7);
    return date.toISOString().slice(0, 10);
  }

  if (range === "30d") {
    date.setDate(now.getDate() - 30);
    return date.toISOString().slice(0, 10);
  }

  if (range === "90d") {
    date.setDate(now.getDate() - 90);
    return date.toISOString().slice(0, 10);
  }

  if (range === "mtd") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().slice(0, 10);
  }

  return null;
}

function buildReportFilter({ scope, userId, range, from, to, status }) {
  const conditions = [];
  const params = [];

  if (scope !== "all") {
    conditions.push("r.user_id = ?");
    params.push(userId);
  }

  if (status && status !== "all") {
    conditions.push("r.status = ?");
    params.push(status);
  }

  let startDate = from;
  let endDate = to;
  if (!startDate && !endDate) {
    startDate = getRangeStart(range);
  }

  if (startDate) {
    conditions.push("date(r.created_at) >= date(?)");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("date(r.created_at) <= date(?)");
    params.push(endDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params, startDate: startDate || null, endDate: endDate || null };
}

function getComparisonWhereClause({ scope, userId, status }) {
  const conditions = [];
  const params = [];

  if (scope !== "all") {
    conditions.push("r.user_id = ?");
    params.push(userId);
  }

  if (status && status !== "all") {
    conditions.push("r.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params };
}

function weightedMovingAverage(values) {
  if (!values.length) {
    return 0;
  }

  let weightedSum = 0;
  let weightTotal = 0;

  values.forEach((value, index) => {
    const weight = index + 1;
    weightedSum += Number(value || 0) * weight;
    weightTotal += weight;
  });

  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
}

function normalizeWeekday(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getDay();
}

async function finalizeExpiredRentals() {
  const today = new Date().toISOString().slice(0, 10);
  const expiredRentals = await all(
    `SELECT id, item_id, quantity
     FROM rentals
     WHERE status = 'active' AND end_date < ?`,
    [today]
  );

  for (const rental of expiredRentals) {
    await run("UPDATE rentals SET status = 'finished' WHERE id = ?", [rental.id]);
    await run("UPDATE items SET stock = stock + ? WHERE id = ?", [rental.quantity, rental.item_id]);
  }
}

router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { itemId, quantity, startDate, endDate } = req.body;

    if (!itemId || !quantity || !startDate || !endDate) {
      return res.status(400).json({ message: "Informe itemId, quantity, startDate e endDate." });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantidade invalida." });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || end < start) {
      return res.status(400).json({ message: "Periodo de aluguel invalido." });
    }

    const item = await get("SELECT id, name, daily_rate, stock FROM items WHERE id = ?", [itemId]);
    if (!item) {
      return res.status(404).json({ message: "Item nao encontrado." });
    }

    if (item.stock < qty) {
      return res.status(409).json({ message: "Estoque insuficiente para esse item." });
    }

    const days = calculateDays(start, end);
    const totalPrice = Number((days * item.daily_rate * qty).toFixed(2));

    const rentalResult = await run(
      `INSERT INTO rentals (user_id, item_id, quantity, start_date, end_date, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [req.user.id, item.id, qty, startDate, endDate, totalPrice]
    );

    await run("UPDATE items SET stock = stock - ? WHERE id = ?", [qty, item.id]);

    return res.status(201).json({
      message: "Aluguel registrado com sucesso.",
      rental: {
        id: rentalResult.id,
        userId: req.user.id,
        itemId: item.id,
        itemName: item.name,
        quantity: qty,
        startDate,
        endDate,
        totalPrice,
        status: "active"
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar aluguel.", detail: error.message });
  }
});

router.get("/my", async (req, res) => {
  try {
    await finalizeExpiredRentals();

    const rentals = await all(
      `SELECT r.id, r.quantity, r.start_date, r.end_date, r.total_price, r.status, r.created_at,
              i.name AS item_name, i.daily_rate
       FROM rentals r
       INNER JOIN items i ON i.id = r.item_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json(rentals);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar alugueis.", detail: error.message });
  }
});

router.get("/report", async (req, res) => {
  try {
    await finalizeExpiredRentals();

    const scope = req.query.scope === "all" ? "all" : "mine";
    const range = String(req.query.range || "30d");
    const from = req.query.from ? String(req.query.from) : "";
    const to = req.query.to ? String(req.query.to) : "";
    const status = req.query.status ? String(req.query.status) : "all";

    if (scope === "all" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Somente administradores podem consultar o escopo geral." });
    }

    const validRanges = ["7d", "30d", "90d", "mtd", "all"];
    if (!validRanges.includes(range)) {
      return res.status(400).json({ message: "Faixa de periodo invalida." });
    }

    const validStatus = ["all", "active", "cancelled", "finished"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Status de filtro invalido." });
    }

    const { whereClause, params, startDate, endDate } = buildReportFilter({
      scope,
      userId: req.user.id,
      range,
      from,
      to,
      status
    });

    const { whereClause: comparisonWhere, params: comparisonParams } = getComparisonWhereClause({
      scope,
      userId: req.user.id,
      status
    });

    const rentals = await all(
      `SELECT r.id, r.user_id, u.name AS user_name, i.name AS item_name, r.quantity,
              r.start_date, r.end_date, r.total_price, r.status, r.created_at
       FROM rentals r
       INNER JOIN items i ON i.id = r.item_id
       INNER JOIN users u ON u.id = r.user_id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params
    );

    const monthly = await all(
      `SELECT substr(r.created_at, 1, 7) AS month,
              COUNT(*) AS total_rentals,
              COALESCE(SUM(CASE WHEN r.status IN ('active', 'finished') THEN r.total_price ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancellations
       FROM rentals r
       ${whereClause}
       GROUP BY substr(r.created_at, 1, 7)
       ORDER BY month ASC`,
      params
    );

    const topItems = await all(
      `SELECT i.name AS item_name,
              COALESCE(SUM(r.quantity), 0) AS quantity,
              COALESCE(SUM(CASE WHEN r.status IN ('active', 'finished') THEN r.total_price ELSE 0 END), 0) AS revenue
       FROM rentals r
       INNER JOIN items i ON i.id = r.item_id
       ${whereClause}
       GROUP BY i.name
       ORDER BY quantity DESC, revenue DESC
       LIMIT 10`,
      params
    );

    const totalRentals = rentals.length;
    const activeRentals = rentals.filter((rental) => rental.status === "active").length;
    const cancelledRentals = rentals.filter((rental) => rental.status === "cancelled").length;
    const finishedRentals = rentals.filter((rental) => rental.status === "finished").length;
    const confirmedRevenue = Number(
      rentals
        .filter((rental) => rental.status === "active" || rental.status === "finished")
        .reduce((sum, rental) => sum + Number(rental.total_price || 0), 0)
        .toFixed(2)
    );

    const avgTicket = totalRentals ? Number((confirmedRevenue / totalRentals).toFixed(2)) : 0;
    const cancellationRate = totalRentals ? Number(((cancelledRentals / totalRentals) * 100).toFixed(2)) : 0;

    let yoy = {
      currentMonth: null,
      previousYearMonth: null,
      currentRevenue: 0,
      previousRevenue: 0,
      deltaPercent: null
    };

    if (monthly.length > 0) {
      const currentMonth = monthly[monthly.length - 1].month;
      const [yearText, monthText] = currentMonth.split("-");
      const previousYearMonth = `${Number(yearText) - 1}-${monthText}`;

      const currentRow = await get(
        `SELECT COALESCE(SUM(CASE WHEN r.status IN ('active', 'finished') THEN r.total_price ELSE 0 END), 0) AS revenue
         FROM rentals r
         ${comparisonWhere ? `${comparisonWhere} AND` : "WHERE"} substr(r.created_at, 1, 7) = ?`,
        [...comparisonParams, currentMonth]
      );

      const previousRow = await get(
        `SELECT COALESCE(SUM(CASE WHEN r.status IN ('active', 'finished') THEN r.total_price ELSE 0 END), 0) AS revenue
         FROM rentals r
         ${comparisonWhere ? `${comparisonWhere} AND` : "WHERE"} substr(r.created_at, 1, 7) = ?`,
        [...comparisonParams, previousYearMonth]
      );

      const currentRevenueValue = Number(currentRow && currentRow.revenue ? currentRow.revenue : 0);
      const previousRevenueValue = Number(previousRow && previousRow.revenue ? previousRow.revenue : 0);
      const deltaPercent =
        previousRevenueValue === 0
          ? null
          : Number((((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100).toFixed(2));

      yoy = {
        currentMonth,
        previousYearMonth,
        currentRevenue: currentRevenueValue,
        previousRevenue: previousRevenueValue,
        deltaPercent
      };
    }

    const trailingRevenues = monthly.slice(-3).map((row) => Number(row.revenue || 0));
    const forecastNextMonthRevenue = trailingRevenues.length
      ? Number(
          (trailingRevenues.reduce((sum, value) => sum + value, 0) / trailingRevenues.length).toFixed(2)
        )
      : 0;

    const weightedForecast = Number(weightedMovingAverage(monthly.slice(-6).map((row) => row.revenue || 0)).toFixed(2));

    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    rentals.forEach((rental) => {
      const weekday = normalizeWeekday(rental.created_at);
      if (weekday !== null) {
        weekdayCounts[weekday] += 1;
      }
    });

    const totalWeekdayEvents = weekdayCounts.reduce((sum, value) => sum + value, 0);
    const avgShare = 1 / 7;
    const peakShare = totalWeekdayEvents === 0 ? avgShare : Math.max(...weekdayCounts) / totalWeekdayEvents;
    const seasonalStrength = Math.max(0, peakShare - avgShare);
    const seasonalFactor = Number((1 + Math.min(0.3, seasonalStrength)).toFixed(4));
    const seasonalAdjustedForecast = Number((weightedForecast * seasonalFactor).toFixed(2));

    return res.json({
      period: {
        range,
        startDate,
        endDate: endDate || null,
        scope,
        status
      },
      summary: {
        totalRentals,
        activeRentals,
        cancelledRentals,
        finishedRentals,
        confirmedRevenue,
        avgTicket,
        cancellationRate
      },
      comparisons: {
        yoy,
        forecasts: {
          simpleAverageNextMonthRevenue: forecastNextMonthRevenue,
          weightedNextMonthRevenue: weightedForecast,
          seasonalAdjustedNextMonthRevenue: seasonalAdjustedForecast,
          seasonalFactor,
          weekdayDistribution: weekdayCounts
        }
      },
      monthly,
      topItems,
      rentals
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar relatorio.", detail: error.message });
  }
});

router.patch("/:id/finish", async (req, res) => {
  try {
    const rentalId = Number(req.params.id);
    if (!Number.isInteger(rentalId)) {
      return res.status(400).json({ message: "ID do aluguel invalido." });
    }

    const rental = await get(
      "SELECT id, item_id, quantity, status FROM rentals WHERE id = ? AND user_id = ?",
      [rentalId, req.user.id]
    );

    if (!rental) {
      return res.status(404).json({ message: "Aluguel nao encontrado." });
    }

    if (rental.status !== "active") {
      return res.status(409).json({ message: "Somente alugueis ativos podem ser finalizados." });
    }

    await run("UPDATE rentals SET status = 'finished' WHERE id = ?", [rentalId]);
    await run("UPDATE items SET stock = stock + ? WHERE id = ?", [rental.quantity, rental.item_id]);

    return res.json({ message: "Aluguel finalizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao finalizar aluguel.", detail: error.message });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const rentalId = Number(req.params.id);
    if (!Number.isInteger(rentalId)) {
      return res.status(400).json({ message: "ID do aluguel invalido." });
    }

    const rental = await get(
      "SELECT id, item_id, quantity, status FROM rentals WHERE id = ? AND user_id = ?",
      [rentalId, req.user.id]
    );

    if (!rental) {
      return res.status(404).json({ message: "Aluguel nao encontrado." });
    }

    if (rental.status !== "active") {
      return res.status(409).json({ message: "Somente alugueis ativos podem ser cancelados." });
    }

    await run("UPDATE rentals SET status = 'cancelled' WHERE id = ?", [rentalId]);
    await run("UPDATE items SET stock = stock + ? WHERE id = ?", [rental.quantity, rental.item_id]);

    return res.json({ message: "Aluguel cancelado com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao cancelar aluguel.", detail: error.message });
  }
});

module.exports = router;
