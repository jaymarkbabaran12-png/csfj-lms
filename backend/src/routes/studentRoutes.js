const express = require("express");

const {
  getMyCourses,
  getCourseDetails,
  getCourseModules,
  getMyAssignments,
} = require("../controllers/studentController");

const {
  downloadStudentMaterial,
} = require("../controllers/materialController");

const {
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

const {
  getStudentNotifications,
  markStudentNotificationRead,
} = require("../controllers/studentNotificationController");

// All routes in this file require a logged-in student.
router.use(requireRole("student"));

router.get("/notifications", getStudentNotifications);
router.patch("/notifications/:id/read", markStudentNotificationRead);
// List courses where the student is actively enrolled.
router.get("/courses", getMyCourses);
router.get("/assignments", getMyAssignments);

// Get details of one actively enrolled course.
router.get("/courses/:id", getCourseDetails);

// Get modules and their learning materials.
router.get("/courses/:id/modules", getCourseModules);

// Download a material only if the student is actively enrolled.
router.get("/materials/:id/download", downloadStudentMaterial);

module.exports = router;