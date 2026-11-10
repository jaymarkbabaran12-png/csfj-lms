require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("../src/config/database");

async function migrate() {
  if (!pool.isPostgres) {
    console.log("Using the existing MySQL-compatible database; schema migration skipped.");
    return;
  }

  const migrationPath = path.join(__dirname, "../migrations/001_initial_schema.sql");
  const migration = await fs.readFile(migrationPath, "utf8");
  const statements = migration
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log("Supabase PostgreSQL schema is ready.");
}

async function main() {
  try {
    await migrate();
  } catch (error) {
    console.error("Database migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (error) {
      console.error("Database pool close failed:", error.message);
      process.exitCode = 1;
    }
  }
}

main();
