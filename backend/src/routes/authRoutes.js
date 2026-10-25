const express = require("express");
const router = express.Router();

const {
  login,
  getCurrentUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  logout
} = require("../controllers/authController");

const { requireAuth } = require("../middleware/authMiddleware");

router.post("/login", login);

router.get("/me", requireAuth, getCurrentUser);

router.get("/profile", requireAuth, getMyProfile);
router.put("/profile", requireAuth, updateMyProfile);
router.patch("/change-password", requireAuth, changeMyPassword);

router.post("/logout", requireAuth, logout);

module.exports = router;