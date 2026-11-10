require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("readline");
const pool = require("../src/config/database");

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) =>
    new Promise((resolve) => rl.question(question, resolve));

  let db;

  try {
    const password = await ask("Enter a NEW password for admin: ");
    const confirmation = await ask("Confirm the new password: ");

    if (password.length < 8 || password.length > 128) {
      throw new Error("Password must contain 8 to 128 characters.");
    }

    if (password !== confirmation) {
      throw new Error("Passwords do not match.");
    }

    db = await pool.getConnection();

    const [admins] = await db.execute(
      "SELECT id, username, role FROM users WHERE username = ? AND role = ?",
      ["admin", "admin"]
    );

    if (admins.length !== 1) {
      throw new Error(
        `Expected exactly one admin account named 'admin'; found ${admins.length}. No password changed.`
      );
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      "UPDATE users SET password = ? WHERE id = ? AND username = ? AND role = ?",
      [hash, admins[0].id, "admin", "admin"]
    );

    if (result.affectedRows !== 1) {
      throw new Error("Password was not updated. Check the database.");
    }

    console.log("Admin password updated successfully.");
    console.log(`Account: ${admins[0].username} (ID ${admins[0].id})`);
    console.log("You can now log in using the new password.");
  } finally {
    if (db) db.release();
    await pool.end();
    rl.close();
  }
}

main().catch((error) => {
  console.error("Password reset failed:", error.message);
  process.exitCode = 1;
});
