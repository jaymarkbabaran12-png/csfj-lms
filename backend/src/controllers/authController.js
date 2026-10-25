const bcrypt = require("bcryptjs");

async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Validate input
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required."
      });
    }

    // Find user in the existing database
    const [users] = await req.app.locals.db.execute(
      `SELECT id, username, password, role
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    const user = users[0];

    // Verify bcrypt password hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    // Regenerate session ID after successful authentication
    req.session.regenerate((error) => {
      if (error) {
        console.error("Session regeneration failed:", error.message);

        return res.status(500).json({
          success: false,
          message: "Unable to create a login session."
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save failed:", saveError.message);

          return res.status(500).json({
            success: false,
            message: "Unable to save login session."
          });
        }

        return res.json({
          success: true,
          message: "Login successful.",
          user: req.session.user
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred."
    });
  }
}

function getCurrentUser(req, res) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  return res.json({
    success: true,
    user: req.session.user
  });
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Unable to log out."
      });
    }

    res.clearCookie("csfj_lms.sid");

    return res.json({
      success: true,
      message: "Logout successful."
    });
  });
}

async function getMyProfile(req, res, next) {
  try {
    const db = req.app.locals.db;
    const userId = Number(req.session.user.id);

    const [rows] = await db.execute(
      `SELECT id, username, role, full_name, email, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Account not found."
      });
    }

    return res.json({
      success: true,
      user: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const db = req.app.locals.db;
    const userId = Number(req.session.user.id);

    const fullName =
      typeof req.body.full_name === "string"
        ? req.body.full_name.trim()
        : "";

    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim()
        : "";

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (fullName.length < 2 || fullName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 150 characters."
      });
    }

    if (!/^[a-zA-Z0-9_.-]{3,100}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3–100 characters and contain only letters, numbers, dots, underscores, or hyphens."
      });
    }

    if (
      email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const [duplicate] = await db.execute(
      "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
      [username, userId]
    );

    if (duplicate.length) {
      return res.status(409).json({
        success: false,
        message: "Username is already in use."
      });
    }

    const [duplicateEmail] = await db.execute(
      "SELECT id FROM users WHERE LOWER(email) = ? AND id <> ? LIMIT 1",
      [email, userId]
    );

    if (duplicateEmail.length) {
      return res.status(409).json({
        success: false,
        message: "Email is already in use."
      });
    }

    await db.execute(
      `UPDATE users
       SET full_name = ?, username = ?, email = ?
       WHERE id = ?`,
      [fullName, username, email, userId]
    );

    // Keep the username in the current session synchronized.
    req.session.user.username = username;

    req.session.save((error) => {
      if (error) {
        return next(error);
      }

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: userId,
          username,
          full_name: fullName,
          email,
          role: req.session.user.role
        }
      });
    });
  } catch (error) {
    next(error);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    const db = req.app.locals.db;
    const userId = Number(req.session.user.id);

    const currentPassword =
      typeof req.body.currentPassword === "string"
        ? req.body.currentPassword
        : "";

    const newPassword =
      typeof req.body.newPassword === "string"
        ? req.body.newPassword
        : "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "New password must be between 8 and 128 characters."
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "Your new password must be different from your current password."
      });
    }

    const [rows] = await db.execute(
      "SELECT password FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Account not found."
      });
    }

    const matches = await bcrypt.compare(
      currentPassword,
      rows[0].password
    );

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [passwordHash, userId]
    );

    return res.json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getCurrentUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  logout
};