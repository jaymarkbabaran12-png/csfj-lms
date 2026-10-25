const getAssignedCourse = async (db, courseId, instructorId) => {
  const [rows] = await db.execute(
    `SELECT id, course_code, course_name
     FROM courses
     WHERE id = ? AND instructor_id = ?
     LIMIT 1`,
    [courseId, instructorId]
  );

  return rows[0] || null;
};

// GET /api/instructor/courses/:courseId/assignments
async function getCourseAssignments(req, res, next) {
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

    const course = await getAssignedCourse(db, courseId, instructorId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not assigned to you.",
      });
    }

    const [assignments] = await db.execute(
      `SELECT
         a.id,
         a.course_id,
         a.module_id,
         a.title,
         a.description,
         a.due_date,
         a.points,
         a.created_at,
         m.title AS module_title,
         COUNT(s.id) AS total_submissions
       FROM assignments a
       LEFT JOIN modules m ON m.id = a.module_id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       WHERE a.course_id = ?
       GROUP BY
         a.id, a.course_id, a.module_id, a.title,
         a.description, a.due_date, a.points, a.created_at,
         m.title
       ORDER BY a.created_at DESC, a.id DESC`,
      [courseId]
    );

    return res.json({
      success: true,
      course,
      totalAssignments: assignments.length,
      assignments: assignments.map((assignment) => ({
        ...assignment,
        points: Number(assignment.points),
        total_submissions: Number(assignment.total_submissions),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/instructor/courses/:courseId/assignments
async function createAssignment(req, res, next) {
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

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    const points =
      req.body.points === undefined ? 100 : Number(req.body.points);

    const moduleId =
      req.body.module_id === undefined || req.body.module_id === ""
        ? null
        : Number(req.body.module_id);

    const dueDate =
      typeof req.body.due_date === "string" && req.body.due_date.trim()
        ? req.body.due_date.trim()
        : null;

    if (!title || title.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Assignment title is required and must not exceed 255 characters.",
      });
    }

    if (!Number.isSafeInteger(points) || points < 1 || points > 100000) {
      return res.status(400).json({
        success: false,
        message: "Points must be a positive whole number.",
      });
    }

    if (moduleId !== null &&
        (!Number.isSafeInteger(moduleId) || moduleId < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    const course = await getAssignedCourse(db, courseId, instructorId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not assigned to you.",
      });
    }

    if (moduleId !== null) {
      const [modules] = await db.execute(
        `SELECT id FROM modules WHERE id = ? AND course_id = ? LIMIT 1`,
        [moduleId, courseId]
      );

      if (modules.length === 0) {
        return res.status(400).json({
          success: false,
          message: "The selected module does not belong to this course.",
        });
      }
    }

    if (dueDate && Number.isNaN(Date.parse(dueDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO assignments
         (course_id, module_id, title, description, due_date, points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, moduleId, title, description || null, dueDate, points]
    );

    const [rows] = await db.execute(
      `SELECT id, course_id, module_id, title, description,
              due_date, points, created_at
       FROM assignments
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      assignment: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/instructor/assignments/:id
async function updateAssignment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const assignmentId = Number(req.params.id);

    if (!Number.isSafeInteger(assignmentId) || assignmentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    const points = Number(req.body.points);

    const moduleId =
      req.body.module_id === undefined || req.body.module_id === ""
        ? null
        : Number(req.body.module_id);

    const dueDate =
      typeof req.body.due_date === "string" && req.body.due_date.trim()
        ? req.body.due_date.trim()
        : null;

    if (!title || title.length > 255) {
      return res.status(400).json({
        success: false,
        message: "A valid assignment title is required.",
      });
    }

    if (!Number.isSafeInteger(points) || points < 1 || points > 100000) {
      return res.status(400).json({
        success: false,
        message: "Points must be a positive whole number.",
      });
    }

    if (moduleId !== null &&
        (!Number.isSafeInteger(moduleId) || moduleId < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    if (dueDate && Number.isNaN(Date.parse(dueDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    const [assignments] = await db.execute(
      `SELECT a.id, a.course_id
       FROM assignments a
       INNER JOIN courses c ON c.id = a.course_id
       WHERE a.id = ? AND c.instructor_id = ?
       LIMIT 1`,
      [assignmentId, instructorId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or not assigned to your course.",
      });
    }

    const courseId = assignments[0].course_id;

    if (moduleId !== null) {
      const [modules] = await db.execute(
        `SELECT id FROM modules WHERE id = ? AND course_id = ? LIMIT 1`,
        [moduleId, courseId]
      );

      if (modules.length === 0) {
        return res.status(400).json({
          success: false,
          message: "The selected module does not belong to this course.",
        });
      }
    }

    await db.execute(
      `UPDATE assignments
       SET module_id = ?, title = ?, description = ?, due_date = ?, points = ?
       WHERE id = ?`,
      [moduleId, title, description || null, dueDate, points, assignmentId]
    );

    const [rows] = await db.execute(
      `SELECT id, course_id, module_id, title, description,
              due_date, points, created_at
       FROM assignments
       WHERE id = ?
       LIMIT 1`,
      [assignmentId]
    );

    return res.json({
      success: true,
      message: "Assignment updated successfully.",
      assignment: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/instructor/assignments/:id
async function deleteAssignment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const assignmentId = Number(req.params.id);

    if (!Number.isSafeInteger(assignmentId) || assignmentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID.",
      });
    }

    const [assignments] = await db.execute(
      `SELECT a.id
       FROM assignments a
       INNER JOIN courses c ON c.id = a.course_id
       WHERE a.id = ? AND c.instructor_id = ?
       LIMIT 1`,
      [assignmentId, instructorId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or not assigned to your course.",
      });
    }

    const [submissions] = await db.execute(
      `SELECT id
       FROM assignment_submissions
       WHERE assignment_id = ?
       LIMIT 1`,
      [assignmentId]
    );

    if (submissions.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This assignment has submissions. It cannot be deleted until those submissions are handled.",
      });
    }

    await db.execute(
      `DELETE FROM assignments WHERE id = ?`,
      [assignmentId]
    );

    return res.json({
      success: true,
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCourseAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
