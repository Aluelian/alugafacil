const express = require("express");
const { get, run } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function isValidMonthKey(monthKey) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

router.use(authMiddleware);

router.get("/:monthKey", async (req, res) => {
  try {
    const monthKey = String(req.params.monthKey || "");
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ message: "Formato de mes invalido. Use YYYY-MM." });
    }

    const goal = await get(
      `SELECT month_key, revenue_goal, rentals_goal, updated_at
       FROM goals
       WHERE user_id = ? AND month_key = ?`,
      [req.user.id, monthKey]
    );

    if (!goal) {
      return res.json({ goal: null });
    }

    return res.json({ goal });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar metas.", detail: error.message });
  }
});

router.put("/:monthKey", async (req, res) => {
  try {
    const monthKey = String(req.params.monthKey || "");
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ message: "Formato de mes invalido. Use YYYY-MM." });
    }

    const revenueGoal = Number(req.body.revenueGoal);
    const rentalsGoal = Number(req.body.rentalsGoal);

    if (!Number.isFinite(revenueGoal) || revenueGoal < 0) {
      return res.status(400).json({ message: "Meta de receita invalida." });
    }

    if (!Number.isInteger(rentalsGoal) || rentalsGoal < 0) {
      return res.status(400).json({ message: "Meta de volume invalida." });
    }

    const previousGoal = await get(
      `SELECT revenue_goal, rentals_goal
       FROM goals
       WHERE user_id = ? AND month_key = ?`,
      [req.user.id, monthKey]
    );

    await run(
      `INSERT INTO goals (user_id, month_key, revenue_goal, rentals_goal)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, month_key)
       DO UPDATE SET
         revenue_goal = excluded.revenue_goal,
         rentals_goal = excluded.rentals_goal,
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, monthKey, revenueGoal, rentalsGoal]
    );

    await run(
      `INSERT INTO goals_history (
        user_id,
        month_key,
        previous_revenue_goal,
        previous_rentals_goal,
        new_revenue_goal,
        new_rentals_goal
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        monthKey,
        previousGoal ? previousGoal.revenue_goal : null,
        previousGoal ? previousGoal.rentals_goal : null,
        revenueGoal,
        rentalsGoal
      ]
    );

    const goal = await get(
      `SELECT month_key, revenue_goal, rentals_goal, updated_at
       FROM goals
       WHERE user_id = ? AND month_key = ?`,
      [req.user.id, monthKey]
    );

    return res.json({ message: "Metas salvas com sucesso.", goal });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao salvar metas.", detail: error.message });
  }
});

router.get("/:monthKey/history", async (req, res) => {
  try {
    const monthKey = String(req.params.monthKey || "");
    if (!isValidMonthKey(monthKey)) {
      return res.status(400).json({ message: "Formato de mes invalido. Use YYYY-MM." });
    }

    const history = await all(
      `SELECT id, month_key, previous_revenue_goal, previous_rentals_goal,
              new_revenue_goal, new_rentals_goal, changed_at
       FROM goals_history
       WHERE user_id = ? AND month_key = ?
       ORDER BY changed_at DESC, id DESC`,
      [req.user.id, monthKey]
    );

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar historico de metas.", detail: error.message });
  }
});

module.exports = router;
