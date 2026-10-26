require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const session = require("express-session");

const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const instructorRoutes = require("./src/routes/instructorRoutes");
const academicRoutes = require("./src/routes/academicRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const hubRoutes = require("./src/routes/hubRoutes");
const hubIntegrationRoutes = require("./src/routes/hubIntegrationRoutes");
const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Render sets RENDER=true automatically. NODE_ENV=production also works.
const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Required on Render: the app sits behind a proxy that terminates HTTPS.
// Without this, secure cookies are never sent.
if (isProduction) {
  app.set("trust proxy", 1);
}

// Allowed frontend origins (comma-separated in FRONTEND_URL).
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

// ==========================================
// 0. IT DEPARTMENT HUB HEALTH AND COURSE LOOKUP
// Student-specific course data requires the Hub API key.
// GET /api/db-check remains public for availability monitoring.
// ==========================================
app.use("/api", hubRoutes);

// ==========================================
// 1. CORS CONFIGURATION
// ==========================================
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (Postman, curl) that send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// ==========================================
// 2. REQUEST BODY MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/integration", hubIntegrationRoutes);

// ==========================================
// 3. SESSION MIDDLEWARE
// Must run BEFORE authentication routes.
// ==========================================
if (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET.trim()) {
  throw new Error(
    "SESSION_SECRET is missing. Check your backend/.env file."
  );
}

app.use(
  session({
    name: "csfj_lms.sid",
    secret: process.env.SESSION_SECRET.trim(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Frontend and backend are on different domains on Render,
      // so production needs secure + sameSite "none".
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// ==========================================
// 4. DATABASE CONNECTION
// ==========================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Csfj_lms",
  // Most hosted MySQL services (Aiven, TiDB Cloud, etc.) require SSL.
  // Set DB_SSL=true in Render's environment variables.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.locals.db = pool;

// ==========================================
// 5. ROOT ENDPOINT
// ==========================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CSFJ LMS REST API is running!",
    version: "1.0.0",
  });
});

// ==========================================
// 6. API HEALTH CHECK
// ==========================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CSFJ LMS API is working.",
  });
});

// ==========================================
// 7. DATABASE CONNECTION TEST
// ==========================================
app.get("/api/test-db", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name"
    );

    res.status(200).json({
      success: true,
      message: "Database connection successful!",
      database: rows[0].database_name,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 8. AUTHENTICATION ROUTES
// Session middleware is already active.
// ==========================================
app.use("/api/auth", authRoutes);

// ==========================================
// 9. ADMIN ROUTES
// ==========================================
app.use("/api/admin", adminRoutes);

// ==========================================
// 10. INSTRUCTOR ROUTES
// ==========================================
app.use("/api/instructor", instructorRoutes);

// ==========================================
// 11. ACADEMIC ROUTES
// ==========================================
app.use("/api/academic", academicRoutes);
app.use("/api/student", studentRoutes);
// ==========================================
// 10. UNKNOWN API ENDPOINT HANDLER
// ==========================================
app.use("/api", (req, res) => {
  console.error(
    `API endpoint not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

// ==========================================
// 11. UNKNOWN NON-API ROUTES
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
    method: req.method,
    path: req.originalUrl,
  });
});

// ==========================================
// 12. GENERAL ERROR HANDLER
// ==========================================
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // Handle Multer upload errors.
  if (error instanceof require("multer").MulterError) {
    console.warn("File upload error:", error.code);

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File is too large. Maximum allowed size is 20 MB.",
      });
    }

    if (
      error.code === "LIMIT_FILE_COUNT" ||
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid file upload. Please upload one file at a time.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to process the uploaded file.",
    });
  }

  // Handle invalid file type errors from materialUpload.js.
  if (error.status === 400) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid request.",
    });
  }

  // Log unexpected errors for debugging.
  console.error("Server error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});
// ==========================================
// 13. START SERVER
// ==========================================
async function startServer() {
  let connection;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      "SELECT DATABASE() AS database_name"
    );

    console.log("------------------------------------");
    console.log("CSFJ LMS BACKEND");
    console.log("------------------------------------");
    console.log(`Database: ${rows[0].database_name}`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Login URL: http://localhost:${PORT}/api/auth/login`);
    console.log(`Allowed frontend: ${allowedOrigins.join(", ")}`);
    console.log("------------------------------------");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error.message);

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        "Check DB_USER and DB_PASSWORD in backend/.env. Prefer a dedicated MySQL user with access to DB_NAME instead of root."
      );
    } else if (
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      console.error(
        "Check that MySQL is running and that DB_HOST and DB_PORT point to the reachable database server."
      );
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error(
        "The configured DB_NAME does not exist. Create the database or correct DB_NAME in backend/.env."
      );
    }

    await pool.end();
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

startServer();