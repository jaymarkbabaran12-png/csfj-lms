const express = require("express");
const { requireHubApiKey } = require("../middleware/hubApiKey");
const {
  getCourseContent,
  downloadMaterial,
  createAssignment,
  createQuiz,
  submitAssignment,
  submitQuiz,
} = require("../controllers/hubIntegrationController");

const router = express.Router();

router.use(requireHubApiKey);
router.get("/students/:studentNumber/courses/:courseId/content", getCourseContent);
router.get("/materials/:materialId/download", downloadMaterial);
router.post("/courses/:courseId/assignments", createAssignment);
router.post("/courses/:courseId/quizzes", createQuiz);
router.post("/assignments/:assignmentId/submissions", submitAssignment);
router.post("/quizzes/:quizId/submissions", submitQuiz);

module.exports = router;