function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito ao administrador." });
  }

  next();
}

module.exports = requireAdmin;
