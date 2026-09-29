const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        return reject(err);
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }

      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }

      resolve(rows);
    });
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON;");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin', 'customer')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const usersInfo = await all("PRAGMA table_info(users)");
  const hasRoleColumn = usersInfo.some((column) => column.name === "role");
  if (!hasRoleColumn) {
    await run(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('admin', 'customer'))"
    );
  }

  const adminCount = await get("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
  if (adminCount && adminCount.total === 0) {
    const firstUser = await get("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    if (firstUser) {
      await run("UPDATE users SET role = 'admin' WHERE id = ?", [firstUser.id]);
    }
  }

  await run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      daily_rate REAL NOT NULL CHECK(daily_rate > 0),
      stock INTEGER NOT NULL DEFAULT 1 CHECK(stock >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_price REAL NOT NULL CHECK(total_price >= 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'finished')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(item_id) REFERENCES items(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month_key TEXT NOT NULL,
      revenue_goal REAL NOT NULL DEFAULT 0 CHECK(revenue_goal >= 0),
      rentals_goal INTEGER NOT NULL DEFAULT 0 CHECK(rentals_goal >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, month_key),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS goals_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month_key TEXT NOT NULL,
      previous_revenue_goal REAL,
      previous_rentals_goal INTEGER,
      new_revenue_goal REAL NOT NULL,
      new_rentals_goal INTEGER NOT NULL,
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  const existingItems = await get("SELECT COUNT(*) AS total FROM items");
  if (!existingItems || existingItems.total === 0) {
    const seedItems = [
      ["Camera Sony A6400", "Camera mirrorless para eventos e ensaios", 130, 4],
      ["Drone DJI Mini 3", "Drone para captação aérea profissional", 210, 2],
      ["Projetor Epson Full HD", "Projetor para palestras e cinema", 95, 5]
    ];

    for (const item of seedItems) {
      await run(
        "INSERT INTO items (name, description, daily_rate, stock) VALUES (?, ?, ?, ?)",
        item
      );
    }
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
