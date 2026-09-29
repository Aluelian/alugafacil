require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDb } = require("./db");

const authRoutes = require("./routes/auth.routes");
const itemRoutes = require("./routes/items.routes");
const rentalRoutes = require("./routes/rentals.routes");
const goalsRoutes = require("./routes/goals.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, project: "AlugaFacil API", date: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/goals", goalsRoutes);

app.use((err, _req, res, _next) => {
  return res.status(500).json({ message: "Erro interno do servidor.", detail: err.message });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao inicializar banco de dados:", error);
    process.exit(1);
  });
