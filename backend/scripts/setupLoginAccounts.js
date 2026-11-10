require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

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

async function promptNewIdentity(label) {
  const identity = {
    username: await promptRequired(`${label} username`, 100),
    fullName: await promptRequired(`${label} full name`, 150),
    email: (await promptRequired(`${label} email`, 150)).toLowerCase(),
  };

  validateUsername(identity.username, `${label} username`);
  validateEmail(identity.email, `${label} email`);

  return identity;
}

async function promptExistingUsername(role) {
  const label = role === "admin" ? "Existing admin username" : "Existing instructor username";
  const username = (await prompt(`${label}: `)).trim();

  validateUsername(username, label);

  return username;
}

async function main() {
  let db;
  let transactionStarted = false;

  try {
    db = await pool.getConnection();

    const [existingUsers] = await db.execute(
      "SELECT id FROM users LIMIT 1"
    );

    let admin;
    let instructor;
    let createInstructor = false;

    if (existingUsers.length === 0) {
      console.log("The users table is empty. This will create the first admin and instructor accounts.");

      admin = await promptNewIdentity("Admin");
      instructor = await promptNewIdentity("Instructor");

      if (
        admin.username.toLowerCase() === instructor.username.toLowerCase() ||
        admin.email === instructor.email
      ) {
        throw new Error("Admin and instructor must have different usernames and email addresses.");
      }

      admin.password = await promptPassword("Admin password");
      instructor.password = await promptPassword("Instructor password");
      createInstructor = true;
    } else {
      const adminUsername = await promptExistingUsername("admin");
      const [admins] = await db.execute(
        "SELECT id FROM users WHERE username = ? AND role = 'admin' LIMIT 1",
        [adminUsername]
      );

      if (admins.length !== 1) {
        throw new Error("No admin account with that username was found.");
      }

      admin = {
        id: admins[0].id,
        password: await promptPassword("New admin password"),
      };

      const [instructors] = await db.execute(
        "SELECT username FROM users WHERE role = 'instructor' ORDER BY username"
      );

      if (instructors.length > 0) {
        const instructorUsername = await promptExistingUsername("instructor");
        const [matches] = await db.execute(
          "SELECT id FROM users WHERE username = ? AND role = 'instructor' LIMIT 1",
          [instructorUsername]
        );

        if (matches.length !== 1) {
          throw new Error("No instructor account with that username was found.");
        }

        instructor = {
          id: matches[0].id,
          password: await promptPassword("New instructor password"),
        };
      } else {
        console.log("No instructor account exists. A new instructor will be created.");
        instructor = await promptNewIdentity("Instructor");
        instructor.password = await promptPassword("Instructor password");
        createInstructor = true;
      }

      if (
        !createInstructor &&
        admin.id === instructor.id
      ) {
        throw new Error("Admin and instructor must be different accounts.");
      }
    }

    const passwordHashes = await Promise.all([
      bcrypt.hash(admin.password, 12),
      bcrypt.hash(instructor.password, 12),
    ]);

    await db.beginTransaction();
    transactionStarted = true;

    if (existingUsers.length === 0) {
      await db.execute(
        `INSERT INTO users (username, password, role, full_name, email)
         VALUES (?, ?, 'admin', ?, ?)`,
        [admin.username, passwordHashes[0], admin.fullName, admin.email]
      );
    } else {
      const [adminUpdate] = await db.execute(
        "UPDATE users SET password = ? WHERE id = ? AND role = 'admin'",
        [passwordHashes[0], admin.id]
      );

      if (adminUpdate.affectedRows !== 1) {
        throw new Error("The admin password was not updated.");
      }
    }

    if (createInstructor) {
      await db.execute(
        `INSERT INTO users (username, password, role, full_name, email)
         VALUES (?, ?, 'instructor', ?, ?)`,
        [
          instructor.username,
          passwordHashes[1],
          instructor.fullName,
          instructor.email,
        ]
      );
    } else {
      const [instructorUpdate] = await db.execute(
        "UPDATE users SET password = ? WHERE id = ? AND role = 'instructor'",
        [passwordHashes[1], instructor.id]
      );

      if (instructorUpdate.affectedRows !== 1) {
        throw new Error("The instructor password was not updated.");
      }
    }

    await db.commit();
    transactionStarted = false;

    console.log("Admin and instructor account setup completed.");
  } catch (error) {
    if (db && transactionStarted) {
      try {
        await db.rollback();
      } catch (rollbackError) {
        console.error("Database rollback failed:", rollbackError.message);
      }
    }

    if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
      console.error("Account setup failed: A username or email is already in use.");
    } else {
      console.error("Account setup failed:", error.message);
    }

    process.exitCode = 1;
  } finally {
    if (db) {
      try {
        db.release();
      } catch (error) {
        console.error("Database connection close failed:", error.message);
        process.exitCode = 1;
      }
    }
    try {
      await pool.end();
    } catch (error) {
      console.error("Database pool close failed:", error.message);
      process.exitCode = 1;
    }
  }
}

main();
