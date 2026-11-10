const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");
const { Pool } = require("pg");

const isPostgres = Boolean(process.env.DATABASE_URL);

function preparePostgresQuery(sql) {
  let output = "";
  let placeholder = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (lineComment) {
      output += character;
      if (character === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      output += character;
      if (character === "*" && nextCharacter === "/") {
        output += nextCharacter;
        index++;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      output += character;
      if (character === quote) {
        if (nextCharacter === quote) {
          output += nextCharacter;
          index++;
        } else {
          quote = null;
        }
      } else if (character === "\\" && nextCharacter) {
        output += nextCharacter;
        index++;
      }
      continue;
    }

    if (character === "-" && nextCharacter === "-") {
      output += character + nextCharacter;
      index++;
      lineComment = true;
    } else if (character === "/" && nextCharacter === "*") {
      output += character + nextCharacter;
      index++;
      blockComment = true;
    } else if (character === "'" || character === '"' || character === "`") {
      quote = character === "`" ? '"' : character;
      output += quote;
    } else if (character === "?") {
      placeholder++;
      output += `$${placeholder}`;
    } else {
      output += character;
    }
  }

  const converted = output
    .replace(/\bDATABASE\(\)/gi, "current_database()")
    .replace(/\bLIKE\b/gi, "ILIKE");

  if (!/^\s*SELECT\b/i.test(converted)) return converted;

  return converted.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/g, (match, alias) =>
      /[A-Z]/.test(alias) ? `AS "${alias}"` : match
    );
}

function withReturningId(sql) {
  const insert = sql.match(/^\s*INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/i);
  if (!insert || /\bRETURNING\b/i.test(sql)) return sql;

  const tablesWithoutId = new Set([
    "hub_quiz_deadlines",
    "hub_quiz_submission_answers",
  ]);
  if (tablesWithoutId.has(insert[1].toLowerCase())) return sql;

  return `${sql.trim().replace(/;$/, "")} RETURNING id`;
}

function createPostgresConnection(client) {
  const run = async (sql, values = []) => {
    const statement = withReturningId(preparePostgresQuery(sql));
    const result = await client.query(statement, values);
    const isSelect = /^\s*(SELECT|WITH)\b/i.test(sql);

    if (isSelect) {
      for (const row of result.rows) {
        for (const field of result.fields) {
          if (field.dataTypeID === 20 && typeof row[field.name] === "string") {
            const value = Number(row[field.name]);
            if (Number.isSafeInteger(value)) row[field.name] = value;
          }
        }
      }
      return [result.rows, result.fields];
    }

    const metadata = { affectedRows: result.rowCount };
    if (result.rows[0]?.id !== undefined) {
      metadata.insertId = Number(result.rows[0].id);
    }
    return [metadata, result.fields];
  };

  return {
    query: run,
    execute: run,
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    release: () => client.release(),
  };
}

if (!isPostgres) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "Csfj_lms",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  module.exports = pool;
  module.exports.isPostgres = false;
} else {
  const connectionUrl = new URL(process.env.DATABASE_URL);
  connectionUrl.searchParams.delete("sslmode");

  const pool = new Pool({
    connectionString: connectionUrl.toString(),
    ssl: {
      ca: fs.readFileSync(
        path.join(__dirname, "../../certs/supabase-root-ca.crt"),
        "utf8"
      ),
      rejectUnauthorized: true,
    },
    max: 10,
  });

  module.exports = {
    isPostgres: true,
    query: async (sql, values) => {
      const connection = createPostgresConnection(await pool.connect());
      try {
        return await connection.query(sql, values);
      } finally {
        connection.release();
      }
    },
    execute: async (sql, values) => {
      const connection = createPostgresConnection(await pool.connect());
      try {
        return await connection.execute(sql, values);
      } finally {
        connection.release();
      }
    },
    getConnection: async () => createPostgresConnection(await pool.connect()),
    end: () => pool.end(),
  };
}

module.exports.preparePostgresQuery = preparePostgresQuery;
