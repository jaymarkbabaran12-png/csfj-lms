const VALID_STATUSES = ["active", "completed", "dropped"];

// GET /api/admin/enrollments
async function getEnrollments(req, res, next) {
  try {
    const db = req.app.locals.db;
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    let sql = `
      SELECT
        ce.id,
        ce.student_id AS user_id,
        ce.course_id,
        ce.enrollment_status,
        ce.enrolled_at,
        u.student_id AS student_number,
        u.username,
        u.full_name,
        u.email,
        u.course AS student_program,
        u.year_level,
        c.course_code,
        c.course_name
      FROM course_enrollments ce
      INNER JOIN users u
        ON u.id = ce.student_id
       AND u.role = 'student'
      INNER JOIN courses c
        ON c.id = ce.course_id
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          u.student_id LIKE ?
          OR u.full_name LIKE ?
          OR u.username LIKE ?
          OR u.email LIKE ?
          OR c.course_code LIKE ?
          OR c.course_name LIKE ?
          OR ce.enrollment_status LIKE ?
        )
      `;

      const keyword = `%${search}%`;
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword
      );
    }

    sql += `
      ORDER BY ce.enrolled_at DESC, ce.id DESC
    `;

    const [enrollments] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      enrollments,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/enrollment-options
async function getEnrollmentOptions(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [students] = await db.execute(`
      SELECT
        id,
        student_id,
        username,
        full_name,
        email,
        course,
        year_level
      FROM users
      WHERE role = 'student'
      ORDER BY full_name ASC, username ASC
    `);

    const [courses] = await db.execute(`
      SELECT
        id,
        course_code,
        course_name,
        instructor_id
      FROM courses
      ORDER BY course_code ASC
    `);

    return res.status(200).json({
      success: true,
      students,
      courses,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/enrollments
async function createEnrollment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = Number(req.body.student_id);
    const courseId = Number(req.body.course_id);

    if (
      !Number.isSafeInteger(studentId) ||
      studentId < 1 ||
      !Number.isSafeInteger(courseId) ||
      courseId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid student and course.",
      });
    }

    const [students] = await db.execute(
      `SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const [courses] = await db.execute(
      `SELECT id FROM courses WHERE id = ? LIMIT 1`,
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const [existing] = await db.execute(
      `SELECT id, enrollment_status
       FROM course_enrollments
       WHERE student_id = ? AND course_id = ?
       LIMIT 1`,
      [studentId, courseId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This student already has an enrollment record for this course. Update the existing record instead.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO course_enrollments
         (student_id, course_id, enrollment_status)
       VALUES (?, ?, 'active')`,
      [studentId, courseId]
    );

    return res.status(201).json({
      success: true,
      message: "Student enrolled successfully.",
      enrollmentId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/enrollments/:id/status
async function updateEnrollmentStatus(req, res, next) {
  try {
    const db = req.app.locals.db;
    const enrollmentId = Number(req.params.id);
    const status =
      typeof req.body.status === "string"
        ? req.body.status.trim().toLowerCase()
        : "";

    if (!Number.isSafeInteger(enrollmentId) || enrollmentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, completed, or dropped.",
      });
    }

    const [existing] = await db.execute(
      `SELECT id FROM course_enrollments WHERE id = ? LIMIT 1`,
      [enrollmentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment record not found.",
      });
    }

    await db.execute(
      `UPDATE course_enrollments
       SET enrollment_status = ?
       WHERE id = ?`,
      [status, enrollmentId]
    );

    return res.status(200).json({
      success: true,
      message: "Enrollment status updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/enrollments/:id
async function deleteEnrollment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const enrollmentId = Number(req.params.id);

    if (!Number.isSafeInteger(enrollmentId) || enrollmentId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    const [existing] = await db.execute(
      `SELECT id FROM course_enrollments WHERE id = ? LIMIT 1`,
      [enrollmentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment record not found.",
      });
    }

    await db.execute(
      `DELETE FROM course_enrollments WHERE id = ?`,
      [enrollmentId]
    );

    return res.status(200).json({
      success: true,
      message: "Enrollment record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEnrollments,
  getEnrollmentOptions,
  createEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
};
