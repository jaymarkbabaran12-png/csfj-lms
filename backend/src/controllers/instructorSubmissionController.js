// GET /api/instructor/courses/:courseId/submissions
async function getCourseSubmissions(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const courseId = Number(req.params.courseId);

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    // Verify that the course belongs to the logged-in instructor.
    const [courses] = await db.execute(
      `SELECT id, course_code, course_name
       FROM courses
       WHERE id = ? AND instructor_id = ?
       LIMIT 1`,
      [courseId, instructorId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not assigned to you.",
      });
    }

    const [rows] = await db.execute(
      `SELECT
          ass.id AS submission_id,
          ass.assignment_id,
          ass.student_id,
          ass.submission_text,
          ass.submission_file,
          ass.score,
          ass.feedback,
          ass.submitted_at,
          ass.graded_at,
          a.title AS assignment_title,
          a.points AS max_points,
          a.due_date,
          u.full_name AS student_name,
          u.username AS student_username,
          u.email AS student_email
       FROM assignments a
       INNER JOIN assignment_submissions ass
         ON ass.assignment_id = a.id
       INNER JOIN users u
         ON u.id = ass.student_id
       WHERE a.course_id = ?
       ORDER BY ass.submitted_at DESC, ass.id DESC`,
      [courseId]
    );

    return res.json({
      success: true,
      course: courses[0],
      submissions: rows,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/instructor/submissions/:submissionId/grade
async function gradeSubmission(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const submissionId = Number(req.params.submissionId);

    const score = Number(req.body.score);
    const feedback =
      req.body.feedback == null ? "" : String(req.body.feedback).trim();

    if (!Number.isSafeInteger(submissionId) || submissionId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    if (
      req.body.score === undefined ||
      req.body.score === null ||
      req.body.score === "" ||
      !Number.isFinite(score) ||
      score < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Score must be a valid non-negative number.",
      });
    }

    if (feedback.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Feedback must not exceed 5000 characters.",
      });
    }

    // Confirm that this submission belongs to a course assigned
    // to the currently logged-in instructor.
    const [rows] = await db.execute(
      `SELECT
          ass.id,
          a.points AS max_points
       FROM assignment_submissions ass
       INNER JOIN assignments a
         ON a.id = ass.assignment_id
       INNER JOIN courses c
         ON c.id = a.course_id
       WHERE ass.id = ?
         AND c.instructor_id = ?
       LIMIT 1`,
      [submissionId, instructorId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found or not assigned to you.",
      });
    }

    const maxPoints = Number(rows[0].max_points);

    if (score > maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Score cannot exceed ${maxPoints} points.`,
      });
    }

    await db.execute(
      `UPDATE assignment_submissions
       SET score = ?,
           feedback = ?,
           graded_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [score, feedback || null, submissionId]
    );

    return res.json({
      success: true,
      message: "Submission graded successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCourseSubmissions,
  gradeSubmission,
};
