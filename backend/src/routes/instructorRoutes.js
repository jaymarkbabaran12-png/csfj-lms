const express = require("express");

const {
  getInstructorCourses,
  getCourseStudents,
} = require("../controllers/courseController");

const {
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
} = require("../controllers/instructorModuleController");

const {
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

const {
  getCourseAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require("../controllers/instructorAssignmentController");

const {
  getCourseSubmissions,
  gradeSubmission,
} = require("../controllers/instructorSubmissionController");

const {
  getModuleMaterials,
  uploadModuleMaterial,
  deleteModuleMaterial,
} = require("../controllers/materialController");

const { uploadMaterial } = require("../middleware/materialUpload");


// All instructor endpoints require instructor authentication.
router.use(requireRole("instructor"));

// Courses and enrolled students
router.get("/courses", getInstructorCourses);
router.get("/courses/:id/students", getCourseStudents);

// Module management
router.get("/courses/:courseId/modules", getCourseModules);
router.post("/courses/:courseId/modules", createModule);
router.put("/modules/:id", updateModule);
router.delete("/modules/:id", deleteModule);

// Assignment management
router.get("/courses/:courseId/assignments", getCourseAssignments);
router.post("/courses/:courseId/assignments", createAssignment);
router.put("/assignments/:id", updateAssignment);
router.delete("/assignments/:id", deleteAssignment);

// Submission review and grading
router.get("/courses/:courseId/submissions", getCourseSubmissions);
router.put("/submissions/:submissionId/grade", gradeSubmission);
module.exports = router;

// Learning materials
router.get("/modules/:moduleId/materials", getModuleMaterials);

router.post(
  "/modules/:moduleId/materials",
  uploadMaterial.single("file"),
  uploadModuleMaterial
);

router.delete("/materials/:id", deleteModuleMaterial);