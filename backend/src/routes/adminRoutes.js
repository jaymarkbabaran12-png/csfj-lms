const express = require("express");

const {
  getDashboardStats,
  getUsers,
  createUser,
  updateUser,
  changeUserPassword,
} = require("../controllers/adminController");

const {
  getCourses,
  getInstructors,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/adminCourseController");

const {
  requireRole,
} = require("../middleware/authMiddleware");


const {
  getAdminQuizStats,
  getAdminQuizzes,
  getAdminQuizOptions,
  createAdminQuiz,
  getAdminQuizDetails,
  addAdminQuizQuestion,
  deleteAdminQuiz,
} = require("../controllers/adminQuizController");

const router = express.Router();

const {
  getAcademicProgramsAdmin,
  createCurriculumSubject,
  updateCurriculumSubject,
  deleteCurriculumSubject,
} = require("../controllers/adminAcademicController");

const {
  getEnrollments,
  getEnrollmentOptions,
  createEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
} = require("../controllers/adminEnrollmentController");

const {
  getAdminAssignments,
  getAdminAssignmentStats,
} = require("../controllers/adminAssignmentController");

const {
  getReportsOverview,
  getUserReports,
  getEnrollmentReports,
  getAcademicReports,
  getPerformanceReports,
} = require("../controllers/adminReportsController");

// All routes in this file require administrator access.
router.use(requireRole("admin"));

// Dashboard statistics
router.get("/dashboard/stats", getDashboardStats);
// Admin assignment management
router.get("/assignments/stats", getAdminAssignmentStats);
router.get("/assignments", getAdminAssignments);

// Admin quiz management
router.get("/quizzes/stats", getAdminQuizStats);
router.get("/quizzes", getAdminQuizzes);
router.get("/quiz-options", getAdminQuizOptions);
router.post("/quizzes", createAdminQuiz);
router.get("/quizzes/:id", getAdminQuizDetails);
router.post("/quizzes/:id/questions", addAdminQuizQuestion);
router.delete("/quizzes/:id", deleteAdminQuiz);


// User management
router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/password", changeUserPassword);

// Course management
router.get("/courses", getCourses);
router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

// Instructor options for course assignment
router.get("/instructors", getInstructors);
// Academic programs and curriculum management
router.get("/academic/programs", getAcademicProgramsAdmin);
router.post("/academic/subjects", createCurriculumSubject);
router.put("/academic/subjects/:id", updateCurriculumSubject);
router.delete("/academic/subjects/:id", deleteCurriculumSubject);

// Enrollment management
router.get("/enrollments", getEnrollments);
router.get("/enrollment-options", getEnrollmentOptions);
router.post("/enrollments", createEnrollment);
router.patch(
  "/enrollments/:id/status",
  updateEnrollmentStatus
);
router.delete("/enrollments/:id", deleteEnrollment);

router.get("/reports/overview", getReportsOverview);
router.get("/reports/users", getUserReports);
router.get("/reports/enrollments", getEnrollmentReports);
router.get("/reports/academic", getAcademicReports);
router.get("/reports/performance", getPerformanceReports);

module.exports = router;