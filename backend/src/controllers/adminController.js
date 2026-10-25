const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = ["admin", "instructor", "student"];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateStudentProfile(body) {
  const profile = {
    student_id: cleanString(body.student_id),
    full_name: cleanString(body.full_name),
    email: cleanString(body.email),
    course: cleanString(body.course),
    year_level: cleanString(body.year_level),
  };

  if (
    !profile.student_id ||
    !profile.full_name ||
    !profile.email ||
    !profile.course ||
    !profile.year_level
  ) {
    return {
      error: "Student ID, full name, email, course, and year level are required.",
    };
  }

  if (profile.student_id.length > 50) {
    return { error: "Student ID must not exceed 50 characters." };
  }

  if (profile.full_name.length > 150) {
    return { error: "Full name must not exceed 150 characters." };
  }

  if (
    profile.email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
  ) {
    return { error: "Please provide a valid email address." };
  }

  if (profile.course.length > 100) {
    return { error: "Course must not exceed 100 characters." };
  }

  if (profile.year_level.length > 30) {
    return { error: "Year level must not exceed 30 characters." };
  }

  return { profile };
}
function validateInstructorProfile(body) {
  const profile = {
    full_name: cleanString(body.full_name),
    email: cleanString(body.email).toLowerCase(),
  };

  if (!profile.full_name || !profile.email) {
    return {
      error: "Instructor full name and email are required.",
    };
  }

  if (profile.full_name.length > 150) {
    return {
      error: "Full name must not exceed 150 characters.",
    };
  }

  if (
    profile.email.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
  ) {
    return {
      error: "Please provide a valid email address.",
    };
  }

  return { profile };
}
// ==========================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard/stats
// ==========================================
async function getDashboardStats(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [userRows] = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(role = 'admin'), 0) AS totalAdmins,
        COALESCE(SUM(role = 'instructor'), 0) AS totalInstructors,
        COALESCE(SUM(role = 'student'), 0) AS totalStudents
      FROM users
    `);

    const [courseRows] = await db.query(`
      SELECT COUNT(*) AS totalCourses
      FROM courses
    `);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard statistics retrieved successfully.",
      stats: {
        totalUsers: Number(userRows[0].totalUsers),
        totalAdmins: Number(userRows[0].totalAdmins),
        totalInstructors: Number(userRows[0].totalInstructors),
        totalStudents: Number(userRows[0].totalStudents),
        totalCourses: Number(courseRows[0].totalCourses),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET USERS
// GET /api/admin/users
// ==========================================
async function getUsers(req, res, next) {
  try {
    const db = req.app.locals.db;
    const search = cleanString(req.query.search);

    let sql = `
      SELECT
        id,
        username,
        role,
        student_id,
        full_name,
        email,
        course,
        year_level,
        created_at
      FROM users
    `;

    const params = [];

    if (search) {
      sql += `
        WHERE username LIKE ?
          OR student_id LIKE ?
          OR full_name LIKE ?
          OR email LIKE ?
          OR course LIKE ?
          OR year_level LIKE ?
      `;

      const keyword = `%${search}%`;
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword
      );
    }

    sql += " ORDER BY id DESC";

    const [users] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CREATE USER
// POST /api/admin/users
// ==========================================
async function createUser(req, res, next) {
  try {
    const db = req.app.locals.db;

    const username = cleanString(req.body.username);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";
    const role = cleanString(req.body.role).toLowerCase();

    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 100 characters.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin, instructor, or student.",
      });
    }

    // Admin accounts cannot be created through normal User Management.
    // Keep the existing administrator account.
    if (role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Creating additional administrator accounts is not allowed.",
      });
    }

    let profile = {
      student_id: null,
      full_name: null,
      email: null,
      course: null,
      year_level: null,
    };

    if (role === "student") {
      const validation = validateStudentProfile(req.body);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      profile = validation.profile;

      const [duplicateStudentId] = await db.execute(
        "SELECT id FROM users WHERE student_id = ? LIMIT 1",
        [profile.student_id]
      );

      if (duplicateStudentId.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That Student ID already exists.",
        });
      }

      const [duplicateEmail] = await db.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [profile.email]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That email address is already in use.",
        });
      }
    }

    if (role === "instructor") {
      const validation = validateInstructorProfile(req.body);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      profile = validation.profile;

      const [duplicateEmail] = await db.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [profile.email]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That email address is already in use.",
        });
      }
    }

    const [existingUsers] = await db.execute(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "That username already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
  `INSERT INTO users
    (
      username,
      password,
      role,
      student_id,
      full_name,
      email,
      course,
      year_level
    )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    username,
    passwordHash,
    role,
    profile.student_id ?? null,
    profile.full_name ?? null,
    profile.email ?? null,
    profile.course ?? null,
    profile.year_level ?? null,
  ]
);

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: {
        id: result.insertId,
        username,
        role,
        ...profile,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A username or student profile value already exists.",
      });
    }

    next(error);
  }
}

// ==========================================
// UPDATE USER
// PUT /api/admin/users/:id
// ==========================================
async function updateUser(req, res, next) {
  try {
    const db = req.app.locals.db;
    const id = Number(req.params.id);
    const username = cleanString(req.body.username);
    const role = cleanString(req.body.role).toLowerCase();

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 100 characters.",
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    if (id === Number(req.session.user.id) && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own administrator role.",
      });
    }

    const [existing] = await db.execute(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const currentRole = String(existing[0].role).toLowerCase();

    // Do not promote another account to administrator.
    if (currentRole !== "admin" && role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Changing another account to administrator is not allowed.",
      });
    }

    // Protect the existing administrator from being demoted.
    if (currentRole === "admin" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "The existing administrator role cannot be changed here.",
      });
    }

    const [duplicateUsername] = await db.execute(
      "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
      [username, id]
    );

    if (duplicateUsername.length > 0) {
      return res.status(409).json({
        success: false,
        message: "That username is already used by another account.",
      });
    }

    // Validate and update profile when the account is a student.
    if (role === "student") {
      const validation = validateStudentProfile(req.body);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const profile = validation.profile;

      const [duplicateStudentId] = await db.execute(
        "SELECT id FROM users WHERE student_id = ? AND id <> ? LIMIT 1",
        [profile.student_id, id]
      );

      if (duplicateStudentId.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That Student ID already exists.",
        });
      }

      const [duplicateEmail] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [profile.email, id]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That email address is already in use.",
        });
      }

      await db.execute(
        `UPDATE users
         SET username = ?,
             role = ?,
             student_id = ?,
             full_name = ?,
             email = ?,
             course = ?,
             year_level = ?
         WHERE id = ?`,
        [
          username,
          role,
          profile.student_id,
          profile.full_name,
          profile.email,
          profile.course,
          profile.year_level,
          id,
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Student profile updated successfully.",
        user: {
          id,
          username,
          role,
          ...profile,
        },
      });
    }

    if (role === "instructor") {
      const validation = validateInstructorProfile(req.body);

      if (validation.error) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      const profile = validation.profile;

      const [duplicateEmail] = await db.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [profile.email, id]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "That email address is already in use.",
        });
      }

      await db.execute(
        `UPDATE users
         SET username = ?,
             role = ?,
             student_id = NULL,
             full_name = ?,
             email = ?,
             course = NULL,
             year_level = NULL
         WHERE id = ?`,
        [username, role, profile.full_name, profile.email, id]
      );

      return res.status(200).json({
        success: true,
        message: "Instructor profile updated successfully.",
        user: {
          id,
          username,
          role,
          student_id: null,
          ...profile,
          course: null,
          year_level: null,
        },
      });
    }

    // Keep existing administrator profile data unchanged.
    await db.execute(
      "UPDATE users SET username = ?, role = ? WHERE id = ?",
      [username, role, id]
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: { id, username, role },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A username or student profile value is already in use.",
      });
    }

    next(error);
  }
}

// ==========================================
// CHANGE USER PASSWORD
// PATCH /api/admin/users/:id/password
// ==========================================
async function changeUserPassword(req, res, next) {
  try {
    const db = req.app.locals.db;
    const id = Number(req.params.id);
    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [passwordHash, id]
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getUsers,
  createUser,
  updateUser,
  changeUserPassword,
};