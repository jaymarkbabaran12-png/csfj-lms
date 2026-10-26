require("dotenv").config();

const mysql = require("mysql2/promise");

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "Csfj_lms",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hub_quiz_deadlines (
        quiz_id INT NOT NULL PRIMARY KEY,
        due_date DATETIME NOT NULL
      ) ENGINE=InnoDB
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hub_quiz_submissions (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        quiz_id INT NOT NULL,
        student_id INT NOT NULL,
        score DECIMAL(10, 2) NOT NULL DEFAULT 0,
        submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_hub_quiz_student (quiz_id, student_id),
        KEY ix_hub_quiz_submissions_student (student_id)
      ) ENGINE=InnoDB
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hub_quiz_submission_answers (
        submission_id BIGINT NOT NULL,
        question_id INT NOT NULL,
        choice_id INT NOT NULL,
        PRIMARY KEY (submission_id, question_id),
        KEY ix_hub_quiz_answers_question (question_id)
      ) ENGINE=InnoDB
    `);
    console.log("Hub integration tables are ready.");
  } finally {
    await db.end();
  }
}

migrate().catch((error) => {
  console.error("Hub integration migration failed:", error.message);
  process.exitCode = 1;
});