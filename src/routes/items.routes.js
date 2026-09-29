const express = require("express");
const { all, get, run } = require("../db");
const authMiddleware = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const items = await all(
      "SELECT id, name, description, daily_rate, stock, created_at FROM items ORDER BY id DESC"
    );
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar itens.", detail: error.message });
  }
});

router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, description, dailyRate, stock } = req.body;

    if (!name || dailyRate === undefined || stock === undefined) {
      return res.status(400).json({ message: "Informe name, dailyRate e stock." });
    }

    const parsedRate = Number(dailyRate);
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return res.status(400).json({ message: "Valor da diaria invalido." });
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: "Estoque invalido." });
    }

    const result = await run(
      "INSERT INTO items (name, description, daily_rate, stock) VALUES (?, ?, ?, ?)",
      [String(name).trim(), String(description || "").trim(), parsedRate, parsedStock]
    );

    const item = await get(
      "SELECT id, name, description, daily_rate, stock, created_at FROM items WHERE id = ?",
      [result.id]
    );

    return res.status(201).json({ message: "Item criado com sucesso.", item });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar item.", detail: error.message });
  }
});

router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const { name, description, dailyRate, stock } = req.body;
    if (!name || dailyRate === undefined || stock === undefined) {
      return res.status(400).json({ message: "Informe name, dailyRate e stock." });
    }

    const parsedRate = Number(dailyRate);
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return res.status(400).json({ message: "Valor da diaria invalido." });
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: "Estoque invalido." });
    }

    const existingItem = await get("SELECT id FROM items WHERE id = ?", [itemId]);
    if (!existingItem) {
      return res.status(404).json({ message: "Item nao encontrado." });
    }

    await run(
      "UPDATE items SET name = ?, description = ?, daily_rate = ?, stock = ? WHERE id = ?",
      [String(name).trim(), String(description || "").trim(), parsedRate, parsedStock, itemId]
    );

    const item = await get(
      "SELECT id, name, description, daily_rate, stock, created_at FROM items WHERE id = ?",
      [itemId]
    );

    return res.json({ message: "Item atualizado com sucesso.", item });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar item.", detail: error.message });
  }
});

router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) {
      return res.status(400).json({ message: "ID do item invalido." });
    }

    const linkedRental = await get("SELECT id FROM rentals WHERE item_id = ? LIMIT 1", [itemId]);
    if (linkedRental) {
      return res.status(409).json({
        message: "Nao e possivel remover item com historico de aluguel. Edite o estoque para 0."
      });
    }

    const result = await run("DELETE FROM items WHERE id = ?", [itemId]);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Item nao encontrado." });
    }

    return res.json({ message: "Item removido com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao remover item.", detail: error.message });
  }
});

module.exports = router;
