const express = require("express");

const {
  getAcademicPrograms,
  getCurriculumSubjects,
} = require("../controllers/courseController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/programs", getAcademicPrograms);
router.get("/programs/:id/subjects", getCurriculumSubjects);

module.exports = router;
