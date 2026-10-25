// backend/src/routes/hubRoutes.js
// Endpoints required by the IT Department Hub (Group 3).
// Both are PUBLIC (no login) and open to CORS, as the Hub requires.

const express = require("express");
const cors = require("cors");

const router = express.Router();

router.use(cors());

// 1. Health check — the Hub calls this to show the LMS as UP or DOWN.
router.get("/db-check", async (req, res) => {
  try {
    await req.app.locals.db.query("SELECT 1");
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("db-check failed:", error.message);
    return res.status(500).json({ ok: false });
  }
});

// 2. Courses of one student, found by student number (e.g. 2026-00234).
// Must always return a LIST. No courses = [] with status 200 (never 404).
router.get("/students/:id/courses", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const studentNumber = String(req.params.id || "").trim();

    if (!studentNumber) {
      return res.status(200).json([]);
    }

    const [rows] = await db.execute(
      `SELECT
         c.course_code,
         c.course_name,
         instructor.full_name AS instructor,
         (SELECT COUNT(*)
            FROM assignments a
           WHERE a.course_id = c.id) AS total_assignments,
         (SELECT COUNT(DISTINCT s.assignment_id)
            FROM assignment_submissions s
            INNER JOIN assignments a2 ON a2.id = s.assignment_id
           WHERE a2.course_id = c.id
             AND s.student_id = u.id) AS submitted_assignments,
         (SELECT ROUND(AVG(s2.score / a3.points * 100), 0)
            FROM assignment_submissions s2
            INNER JOIN assignments a3 ON a3.id = s2.assignment_id
           WHERE a3.course_id = c.id
             AND s2.student_id = u.id
             AND s2.score IS NOT NULL
             AND a3.points > 0) AS lms_grade
       FROM users u
       INNER JOIN course_enrollments ce
         ON ce.student_id = u.id
        AND ce.enrollment_status = 'active'
       INNER JOIN courses c
         ON c.id = ce.course_id
       LEFT JOIN users instructor
         ON instructor.id = c.instructor_id
        AND instructor.role = 'instructor'
       WHERE u.role = 'student'
         AND u.student_id = ?
       ORDER BY c.course_code ASC`,
      [studentNumber]
    );

    const result = rows.map((row) => {
      const total = Number(row.total_assignments) || 0;
      const done = Number(row.submitted_assignments) || 0;

      const course = {
        course_code: row.course_code,
        course_name: row.course_name,
        instructor: row.instructor || "TBA",
        progress_pct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
      };

      // lms_grade is optional: leave it out when nothing is graded yet.
      if (row.lms_grade !== null && row.lms_grade !== undefined) {
        course.lms_grade = Number(row.lms_grade);
      }

      return course;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("hub courses failed:", error);
    return res.status(500).json({ message: "Unable to load courses." });
  }
});

module.exports = router;