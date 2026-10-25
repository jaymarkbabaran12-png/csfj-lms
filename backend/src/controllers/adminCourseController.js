// backend/src/controllers/adminCourseController.js

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const parseCourseId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// ==========================================
// GET ALL COURSES
// GET /api/admin/courses
// Optional query: ?search=
// ==========================================
async function getCourses(req, res, next) {
  try {
    const db = req.app.locals.db;
    const search = cleanString(req.query.search);

    let sql = `
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.instructor_id,
        c.created_at,
        u.full_name AS instructor_name,
        u.username AS instructor_username,
        COUNT(
          DISTINCT CASE
            WHEN ce.enrollment_status = 'active' THEN ce.id
          END
        ) AS enrolled_students
      FROM courses c
      LEFT JOIN users u
        ON u.id = c.instructor_id
        AND u.role = 'instructor'
      LEFT JOIN course_enrollments ce
        ON ce.course_id = c.id
    `;

    const params = [];

    if (search) {
      sql += `
        WHERE (
          c.course_code LIKE ?
          OR c.course_name LIKE ?
          OR c.description LIKE ?
          OR u.full_name LIKE ?
          OR u.username LIKE ?
        )
      `;

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    sql += `
      GROUP BY
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.instructor_id,
        c.created_at,
        u.full_name,
        u.username
      ORDER BY c.course_code ASC
    `;

    const [courses] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      courses: courses.map((course) => ({
        ...course,
        instructor_id:
          course.instructor_id === null
            ? null
            : Number(course.instructor_id),
        enrolled_students: Number(course.enrolled_students),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET AVAILABLE INSTRUCTORS
// GET /api/admin/instructors
// ==========================================
async function getInstructors(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [instructors] = await db.execute(`
      SELECT
        id,
        username,
        full_name,
        email
      FROM users
      WHERE role = 'instructor'
      ORDER BY full_name ASC, username ASC
    `);

    return res.status(200).json({
      success: true,
      instructors,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CREATE COURSE
// POST /api/admin/courses
// ==========================================
async function createCourse(req, res, next) {
  try {
    const db = req.app.locals.db;

    const courseCode = cleanString(req.body.course_code);
    const courseName = cleanString(req.body.course_name);
    const description = cleanString(req.body.description);
    const instructorId =
      req.body.instructor_id === "" ||
      req.body.instructor_id === null ||
      req.body.instructor_id === undefined
        ? null
        : parseCourseId(req.body.instructor_id);

    if (!courseCode || !courseName) {
      return res.status(400).json({
        success: false,
        message: "Course code and course name are required.",
      });
    }

    if (courseCode.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Course code must not exceed 50 characters.",
      });
    }

    if (courseName.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Course name must not exceed 255 characters.",
      });
    }

    if (
      req.body.instructor_id !== undefined &&
      req.body.instructor_id !== "" &&
      req.body.instructor_id !== null &&
      instructorId === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor selection.",
      });
    }

    if (instructorId !== null) {
      const [instructors] = await db.execute(
        `SELECT id FROM users
         WHERE id = ? AND role = 'instructor'
         LIMIT 1`,
        [instructorId]
      );

      if (instructors.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected instructor does not exist.",
        });
      }
    }

    const [existing] = await db.execute(
      `SELECT id FROM courses
       WHERE course_code = ?
       LIMIT 1`,
      [courseCode]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "That course code already exists.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO courses
        (course_code, course_name, description, instructor_id)
       VALUES (?, ?, ?, ?)`,
      [
        courseCode,
        courseName,
        description || null,
        instructorId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course: {
        id: result.insertId,
        course_code: courseCode,
        course_name: courseName,
        description: description || null,
        instructor_id: instructorId,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "That course code already exists.",
      });
    }

    next(error);
  }
}

// ==========================================
// UPDATE COURSE
// PUT /api/admin/courses/:id
// ==========================================
async function updateCourse(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = parseCourseId(req.params.id);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const courseCode = cleanString(req.body.course_code);
    const courseName = cleanString(req.body.course_name);
    const description = cleanString(req.body.description);

    const instructorId =
      req.body.instructor_id === "" ||
      req.body.instructor_id === null ||
      req.body.instructor_id === undefined
        ? null
        : parseCourseId(req.body.instructor_id);

    if (!courseCode || !courseName) {
      return res.status(400).json({
        success: false,
        message: "Course code and course name are required.",
      });
    }

    if (courseCode.length > 50 || courseName.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Course code or course name exceeds its allowed length.",
      });
    }

    if (
      req.body.instructor_id !== undefined &&
      req.body.instructor_id !== "" &&
      req.body.instructor_id !== null &&
      instructorId === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor selection.",
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

    const [duplicates] = await db.execute(
      `SELECT id FROM courses
       WHERE course_code = ? AND id <> ?
       LIMIT 1`,
      [courseCode, courseId]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: "That course code is already used by another course.",
      });
    }

    if (instructorId !== null) {
      const [instructors] = await db.execute(
        `SELECT id FROM users
         WHERE id = ? AND role = 'instructor'
         LIMIT 1`,
        [instructorId]
      );

      if (instructors.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Selected instructor does not exist.",
        });
      }
    }

    await db.execute(
      `UPDATE courses
       SET course_code = ?,
           course_name = ?,
           description = ?,
           instructor_id = ?
       WHERE id = ?`,
      [
        courseCode,
        courseName,
        description || null,
        instructorId,
        courseId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "That course code already exists.",
      });
    }

    next(error);
  }
}

// ==========================================
// DELETE COURSE
// DELETE /api/admin/courses/:id
// ==========================================
async function deleteCourse(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = parseCourseId(req.params.id);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
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

    const [enrollments] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM course_enrollments
       WHERE course_id = ?`,
      [courseId]
    );

    if (Number(enrollments[0].total) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This course has enrollment records and cannot be deleted. Consider unassigning the instructor or managing its enrollments first.",
      });
    }

    await db.execute(
      `DELETE FROM courses WHERE id = ?`,
      [courseId]
    );

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    // Other tables may also reference courses. Preserve those records.
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This course is referenced by other records and cannot be deleted safely.",
      });
    }

    next(error);
  }
}

module.exports = {
  getCourses,
  getInstructors,
  createCourse,
  updateCourse,
  deleteCourse,
};
