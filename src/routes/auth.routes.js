const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { get, run } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Preencha nome, email e senha." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "A senha deve ter ao menos 6 caracteres." });
    }

    const existingUser = await get("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existingUser) {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }

    const usersCount = await get("SELECT COUNT(*) AS total FROM users");
    const role = usersCount && usersCount.total === 0 ? "admin" : "customer";

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, normalizedEmail, passwordHash, role]
    );

    return res.status(201).json({
      message: "Usuario criado com sucesso.",
      user: { id: result.id, name, email: normalizedEmail, role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao registrar usuario.", detail: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Informe email e senha." });
    }

    const user = await get(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ?",
      [normalizedEmail]
    );
    if (!user) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao autenticar usuario.", detail: error.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await get("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao carregar perfil.", detail: error.message });
  }
});

module.exports = router;
