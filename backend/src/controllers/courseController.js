// backend/src/controllers/courseController.js

// ==========================================
// INSTRUCTOR: GET ASSIGNED COURSES
// GET /api/instructor/courses
// ==========================================
async function getInstructorCourses(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    let sql = `
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.instructor_id,
        c.created_at,
        COUNT(
          CASE
            WHEN ce.enrollment_status = 'active' THEN ce.id
          END
        ) AS enrolled_students
      FROM courses c
      LEFT JOIN course_enrollments ce
        ON ce.course_id = c.id
      WHERE c.instructor_id = ?
    `;

    const params = [instructorId];

    if (search) {
      sql += `
        AND (
          c.course_code LIKE ?
          OR c.course_name LIKE ?
          OR c.description LIKE ?
        )
      `;

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
    }

    sql += `
      GROUP BY
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.instructor_id,
        c.created_at
      ORDER BY c.course_code ASC
    `;

    const [courses] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      courses: courses.map((course) => ({
        ...course,
        enrolled_students: Number(course.enrolled_students),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// INSTRUCTOR: GET STUDENTS IN A COURSE
// GET /api/instructor/courses/:id/students
// ==========================================
async function getCourseStudents(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = Number(req.session.user.id);
    const courseId = Number(req.params.id);

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

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

    const [students] = await db.execute(
      `SELECT
         u.id,
         u.username,
         u.student_id,
         u.full_name,
         u.email,
         ce.enrollment_status,
         ce.enrolled_at
       FROM course_enrollments ce
       INNER JOIN users u
         ON u.id = ce.student_id
       WHERE ce.course_id = ?
         AND LOWER(u.role) = 'student'
       ORDER BY u.full_name ASC, u.username ASC`,
      [courseId]
    );

    return res.status(200).json({
      success: true,
      course: courses[0],
      students,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ACADEMIC PROGRAMS
// GET /api/academic/programs
// ==========================================
async function getAcademicPrograms(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [programs] = await db.execute(
      `SELECT
         id,
         program_code,
         program_name,
         description
       FROM academic_programs
       ORDER BY program_name ASC`
    );

    return res.status(200).json({
      success: true,
      programs,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CURRICULUM SUBJECTS
// GET /api/academic/programs/:id/subjects
//
// Optional query parameters:
// year_level = 1, 2, 3, or 4
// semester = 1 or 2
// subject_type = Major or Minor
// ==========================================
async function getCurriculumSubjects(req, res, next) {
  try {
    const db = req.app.locals.db;
    const programId = Number(req.params.id);

    if (!Number.isSafeInteger(programId) || programId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic program ID.",
      });
    }

    // Verify that the academic program exists.
    const [programs] = await db.execute(
      `SELECT
         id,
         program_code,
         program_name
       FROM academic_programs
       WHERE id = ?
       LIMIT 1`,
      [programId]
    );

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic program not found.",
      });
    }

    // Include subject_type in the curriculum response.
    let sql = `
      SELECT
        id,
        program_id,
        subject_code,
        subject_name,
        description,
        year_level,
        semester,
        subject_type,
        units
      FROM curriculum_subjects
      WHERE program_id = ?
    `;

    const params = [programId];

    // Filter by year level.
    if (req.query.year_level !== undefined) {
      const yearLevel = Number(req.query.year_level);

      if (
        !Number.isInteger(yearLevel) ||
        yearLevel < 1 ||
        yearLevel > 4
      ) {
        return res.status(400).json({
          success: false,
          message: "Year level must be between 1 and 4.",
        });
      }

      sql += " AND year_level = ?";
      params.push(yearLevel);
    }

    // Filter by semester.
    if (req.query.semester !== undefined) {
      const semester = Number(req.query.semester);

      if (![1, 2].includes(semester)) {
        return res.status(400).json({
          success: false,
          message: "Semester must be 1 or 2.",
        });
      }

      sql += " AND semester = ?";
      params.push(semester);
    }

    // Filter by subject type.
    if (req.query.subject_type !== undefined) {
      const subjectType =
        typeof req.query.subject_type === "string"
          ? req.query.subject_type.trim()
          : "";

      if (!["Major", "Minor"].includes(subjectType)) {
        return res.status(400).json({
          success: false,
          message: "Subject type must be Major or Minor.",
        });
      }

      sql += " AND subject_type = ?";
      params.push(subjectType);
    }

    sql += `
      ORDER BY
        year_level ASC,
        semester ASC,
        subject_code ASC
    `;

    const [subjects] = await db.execute(sql, params);

    return res.status(200).json({
      success: true,
      program: programs[0],
      subjects,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXPORT CONTROLLERS
// ==========================================
module.exports = {
  getInstructorCourses,
  getCourseStudents,
  getAcademicPrograms,
  getCurriculumSubjects,
};