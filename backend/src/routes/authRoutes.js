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

router.get("/login", (req, res) => {
  res.set("Allow", "POST");
  return res.status(405).json({
    success: false,
    message: "Login requires POST. Use the LMS login form to sign in.",
    allowedMethod: "POST"
  });
});

router.post("/login", login);

router.get("/me", requireAuth, getCurrentUser);

router.get("/profile", requireAuth, getMyProfile);
router.put("/profile", requireAuth, updateMyProfile);
router.patch("/change-password", requireAuth, changeMyPassword);

router.post("/logout", requireAuth, logout);

module.exports = router;