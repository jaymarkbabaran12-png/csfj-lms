const getInstructorCourse = async (db, courseId, instructorId) => {
  const [courses] = await db.execute(
    `SELECT id, course_code, course_name
     FROM courses
     WHERE id = ? AND instructor_id = ?
     LIMIT 1`,
    [courseId, instructorId]
  );

  return courses[0] || null;
};

// GET /api/instructor/courses/:courseId/modules
async function getCourseModules(req, res, next) {
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

    const course = await getInstructorCourse(db, courseId, instructorId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not assigned to you.",
      });
    }

    const [modules] = await db.execute(
      `SELECT id, course_id, title, description, module_order, created_at
       FROM modules
       WHERE course_id = ?
       ORDER BY module_order ASC, id ASC`,
      [courseId]
    );

    return res.json({
      success: true,
      course,
      totalModules: modules.length,
      modules,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/instructor/courses/:courseId/modules
async function createModule(req, res, next) {
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

    const moduleOrder =
      req.body.module_order === undefined ? 1 : Number(req.body.module_order);

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Module title is required.",
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Module title must not exceed 255 characters.",
      });
    }

    if (
      !Number.isSafeInteger(moduleOrder) ||
      moduleOrder < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Module order must be a positive integer.",
      });
    }

    const course = await getInstructorCourse(db, courseId, instructorId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not assigned to you.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO modules (course_id, title, description, module_order)
       VALUES (?, ?, ?, ?)`,
      [courseId, title, description || null, moduleOrder]
    );

    const [rows] = await db.execute(
      `SELECT id, course_id, title, description, module_order, created_at
       FROM modules
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Module created successfully.",
      module: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/instructor/modules/:id
async function updateModule(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const moduleId = Number(req.params.id);

    if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";

    const moduleOrder = Number(req.body.module_order);

    if (!title || title.length > 255) {
      return res.status(400).json({
        success: false,
        message: "A valid module title is required.",
      });
    }

    if (!Number.isSafeInteger(moduleOrder) || moduleOrder < 1) {
      return res.status(400).json({
        success: false,
        message: "Module order must be a positive integer.",
      });
    }

    const [modules] = await db.execute(
      `SELECT m.id, m.course_id
       FROM modules m
       INNER JOIN courses c ON c.id = m.course_id
       WHERE m.id = ? AND c.instructor_id = ?
       LIMIT 1`,
      [moduleId, instructorId]
    );

    if (modules.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Module not found or not assigned to your course.",
      });
    }

    await db.execute(
      `UPDATE modules
       SET title = ?, description = ?, module_order = ?
       WHERE id = ?`,
      [title, description || null, moduleOrder, moduleId]
    );

    const [rows] = await db.execute(
      `SELECT id, course_id, title, description, module_order, created_at
       FROM modules
       WHERE id = ?
       LIMIT 1`,
      [moduleId]
    );

    return res.json({
      success: true,
      message: "Module updated successfully.",
      module: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/instructor/modules/:id
async function deleteModule(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const moduleId = Number(req.params.id);

    if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid module ID.",
      });
    }

    const [modules] = await db.execute(
      `SELECT m.id
       FROM modules m
       INNER JOIN courses c ON c.id = m.course_id
       WHERE m.id = ? AND c.instructor_id = ?
       LIMIT 1`,
      [moduleId, instructorId]
    );

    if (modules.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Module not found or not assigned to your course.",
      });
    }

    // Avoid deleting a module that still has assignments.
    const [assignments] = await db.execute(
      `SELECT id FROM assignments WHERE module_id = ? LIMIT 1`,
      [moduleId]
    );

    if (assignments.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This module has assignments. Remove or reassign those assignments before deleting the module.",
      });
    }

    await db.execute(
      `DELETE FROM modules WHERE id = ?`,
      [moduleId]
    );

    return res.json({
      success: true,
      message: "Module deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
};
