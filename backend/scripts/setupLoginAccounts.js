require("dotenv").config();

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Csfj_lms",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
};

function prompt(question, { secret = false } = {}) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return Promise.reject(
      new Error("Run this command in an interactive terminal.")
    );
  }

  return new Promise((resolve, reject) => {
    let value = "";

    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Account setup cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }

        if (character === "\u007f" || character === "\b") {
          const characters = Array.from(value);

          if (characters.length > 0) {
            characters.pop();
            value = characters.join("");

            if (!secret) {
              process.stdout.write("\b \b");
            }
          }

          continue;
        }

        if (character >= " " && character !== "\u007f") {
          value += character;

          if (!secret) {
            process.stdout.write(character);
          }
        }
      }
    };

    process.stdin.on("data", onData);
  });
}

async function promptRequired(label, maxLength) {
  const value = (await prompt(`${label}: `)).trim();

  if (!value || value.length > maxLength) {
    throw new Error(`${label} is required and must be at most ${maxLength} characters.`);
  }

  return value;
}

function validateUsername(username, label) {
  if (!/^[a-zA-Z0-9_.-]{3,100}$/.test(username)) {
    throw new Error(
      `${label} must be 3–100 characters and contain only letters, numbers, dots, underscores, or hyphens.`
    );
  }
}

function validateEmail(email, label) {
  if (
    email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(`${label} must be a valid email address.`);
  }
}

async function promptPassword(label) {
  const password = await prompt(`${label} (input hidden): `, { secret: true });

  if (password.length < 8 || password.length > 128) {
    throw new Error(`${label} must be between 8 and 128 characters.`);
  }

  const confirmation = await prompt(`Confirm ${label.toLowerCase()}: `, {
    secret: true,
  });

  if (password !== confirmation) {
    throw new Error(`${label} values do not match.`);
  }

  return password;
}

async function main() {
  let db;
  let transactionStarted = false;

  try {
    db = await mysql.createConnection(dbConfig);

    console.log("This will reset one existing admin password and create one instructor and one student account.");
    console.log("No passwords are displayed or saved in this script.");

    const adminUsername = (await prompt("Existing admin username: ")).trim();
    validateUsername(adminUsername, "Admin username");

    const [admins] = await db.execute(
      "SELECT id FROM users WHERE username = ? AND role = 'admin' LIMIT 1",
      [adminUsername]
    );

    if (admins.length !== 1) {
      throw new Error("No admin account with that username was found.");
    }

    const instructor = {
      username: await promptRequired("New instructor username", 100),
      fullName: await promptRequired("Instructor full name", 150),
      email: (await promptRequired("Instructor email", 150)).toLowerCase(),
    };
    validateUsername(instructor.username, "Instructor username");
    validateEmail(instructor.email, "Instructor email");
    instructor.password = await promptPassword("Instructor password");

    const student = {
      username: await promptRequired("New student username", 100),
      studentId: await promptRequired("Student ID", 50),
      fullName: await promptRequired("Student full name", 150),
      email: (await promptRequired("Student email", 150)).toLowerCase(),
      course: await promptRequired("Student course", 100),
      yearLevel: await promptRequired("Student year level", 20),
    };
    validateUsername(student.username, "Student username");
    validateEmail(student.email, "Student email");
    student.password = await promptPassword("Student password");

    if (
      new Set([adminUsername, instructor.username, student.username]).size !== 3
    ) {
      throw new Error("Each account must have a different username.");
    }

    if (instructor.email === student.email) {
      throw new Error("Instructor and student must have different email addresses.");
    }

    const [duplicateUsers] = await db.execute(
      "SELECT id FROM users WHERE username IN (?, ?) LIMIT 1",
      [instructor.username, student.username]
    );

    if (duplicateUsers.length) {
      throw new Error("An instructor or student username already exists.");
    }

    const [duplicateEmails] = await db.execute(
      "SELECT id FROM users WHERE LOWER(email) IN (?, ?) LIMIT 1",
      [instructor.email, student.email]
    );

    if (duplicateEmails.length) {
      throw new Error("An instructor or student email address is already in use.");
    }

    const [duplicateStudentIds] = await db.execute(
      "SELECT id FROM users WHERE student_id = ? LIMIT 1",
      [student.studentId]
    );

    if (duplicateStudentIds.length) {
      throw new Error("That student ID already exists.");
    }

    const newAdminPassword = await promptPassword("New admin password");
    const [adminPassword, instructorPassword, studentPassword] =
      await Promise.all([
        bcrypt.hash(newAdminPassword, 12),
        bcrypt.hash(instructor.password, 12),
        bcrypt.hash(student.password, 12),
      ]);

    await db.beginTransaction();
    transactionStarted = true;

    const [adminUpdate] = await db.execute(
      "UPDATE users SET password = ? WHERE id = ? AND role = 'admin'",
      [adminPassword, admins[0].id]
    );

    if (adminUpdate.affectedRows !== 1) {
      throw new Error("The admin password was not updated.");
    }

    await db.execute(
      `INSERT INTO users
        (username, password, role, full_name, email)
       VALUES (?, ?, 'instructor', ?, ?)`,
      [instructor.username, instructorPassword, instructor.fullName, instructor.email]
    );

    await db.execute(
      `INSERT INTO users
        (username, password, role, student_id, full_name, email, course, year_level)
       VALUES (?, ?, 'student', ?, ?, ?, ?, ?)`,
      [
        student.username,
        studentPassword,
        student.studentId,
        student.fullName,
        student.email,
        student.course,
        student.yearLevel,
      ]
    );

    await db.commit();
    transactionStarted = false;

    console.log("Account setup completed. You can now sign in as admin, instructor, or student.");
  } catch (error) {
    if (db && transactionStarted) {
      try {
        await db.rollback();
      } catch (rollbackError) {
        console.error("Database rollback failed:", rollbackError.message);
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      console.error("Account setup failed: A username, email, or student ID is already in use.");
    } else {
      console.error("Account setup failed:", error.message);
    }

    process.exitCode = 1;
  } finally {
    if (db) {
      try {
        await db.end();
      } catch (error) {
        console.error("Database connection close failed:", error.message);
        process.exitCode = 1;
      }
    }
  }
}

main();
