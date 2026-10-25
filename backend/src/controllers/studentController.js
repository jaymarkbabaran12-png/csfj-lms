async function getMyCourses(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = Number(req.session.user.id);

    if (!Number.isSafeInteger(studentId) || studentId < 1) {
      return res.status(401).json({
        success: false,
        message: "Invalid student session.",
      });
    }

    const [students] = await db.execute(
      `SELECT id, username, student_id, full_name, email, course, year_level
       FROM users
       WHERE id = ? AND role = 'student'
       LIMIT 1`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    const [courses] = await db.execute(
      `SELECT
         ce.id AS enrollment_id,
         ce.enrollment_status,
         ce.enrolled_at,
         c.id AS course_id,
         c.course_code,
         c.course_name,
         c.description,
         u.full_name AS instructor_name
       FROM course_enrollments ce
       INNER JOIN courses c
         ON c.id = ce.course_id
       LEFT JOIN users u
         ON u.id = c.instructor_id
        AND u.role = 'instructor'
       WHERE ce.student_id = ?
         AND ce.enrollment_status = 'active'
       ORDER BY ce.enrolled_at DESC, c.course_code ASC`,
      [studentId]
    );

    return res.status(200).json({
      success: true,
      student: students[0],
      courses,
      totalCourses: courses.length,
    });
  } catch (error) {
    next(error);
  }
}
 async function getCourseDetails(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = Number(req.session.user.id);
    const courseId = Number(req.params.id);

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const [courses] = await db.execute(
      `SELECT
         c.id,
         c.course_code,
         c.course_name,
         c.description,
         c.instructor_id,
         instructor.full_name AS instructor_name,
         ce.enrollment_status,
         ce.enrolled_at
       FROM course_enrollments ce
       INNER JOIN courses c ON c.id = ce.course_id
       LEFT JOIN users instructor
         ON instructor.id = c.instructor_id
        AND instructor.role = 'instructor'
       WHERE ce.student_id = ?
         AND ce.course_id = ?
         AND ce.enrollment_status = 'active'
       LIMIT 1`,
      [studentId, courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you are not actively enrolled.",
      });
    }

    return res.json({
      success: true,
      course: courses[0],
    });
  } catch (error) {
    next(error);
  }
}

async function getCourseModules(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = Number(req.session.user.id);
    const courseId = Number(req.params.id);

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    // Verify that the student is actively enrolled.
    const [enrollments] = await db.execute(
      `SELECT id
       FROM course_enrollments
       WHERE student_id = ?
         AND course_id = ?
         AND enrollment_status = 'active'
       LIMIT 1`,
      [studentId, courseId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found or you are not actively enrolled.",
      });
    }

    const [modules] = await db.execute(
      `SELECT
         id,
         course_id,
         title,
         description,
         module_order,
         created_at
       FROM modules
       WHERE course_id = ?
       ORDER BY module_order ASC, id ASC`,
      [courseId]
    );

    let materials = [];

    if (modules.length > 0) {
      const placeholders = modules.map(() => "?").join(",");

      const moduleIds = modules.map((module) => module.id);

      const [rows] = await db.execute(
  `SELECT
     id,
     module_id,
     title,
     description,
     material_type,
     material_url,
     original_filename,
     mime_type,
     file_size,
     CASE
       WHEN stored_filename IS NOT NULL THEN 1
       ELSE 0
     END AS is_file,
     created_at
   FROM learning_materials
   WHERE module_id IN (${placeholders})
   ORDER BY id ASC`,
  moduleIds
);

      materials = rows;
    }

    const modulesWithMaterials = modules.map((module) => ({
      ...module,
      materials: materials.filter(
        (material) => material.module_id === module.id
      ),
    }));

    return res.json({
      success: true,
      courseId,
      totalModules: modulesWithMaterials.length,
      modules: modulesWithMaterials,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyAssignments(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = Number(req.session.user.id);

    if (!Number.isSafeInteger(studentId) || studentId < 1) {
      return res.status(401).json({
        success: false,
        message: "Invalid student session.",
      });
    }

    const [assignments] = await db.execute(
      `SELECT
         a.id AS assignment_id,
         a.course_id,
         a.module_id,
         a.title,
         a.description,
         a.due_date,
         a.points,
         a.created_at,
         c.course_code,
         c.course_name,
         ass.id AS submission_id,
         ass.submitted_at,
         ass.score,
         ass.feedback,
         ass.graded_at,
         CASE
           WHEN ass.id IS NOT NULL THEN 'Submitted'
           WHEN a.due_date IS NOT NULL AND a.due_date < NOW()
             THEN 'Overdue'
           ELSE 'Pending'
         END AS submission_status
       FROM course_enrollments ce
       INNER JOIN assignments a
         ON a.course_id = ce.course_id
       INNER JOIN courses c
         ON c.id = ce.course_id
       LEFT JOIN assignment_submissions ass
         ON ass.assignment_id = a.id
        AND ass.student_id = ce.student_id
       WHERE ce.student_id = ?
         AND ce.enrollment_status = 'active'
       ORDER BY
         CASE
           WHEN a.due_date IS NULL THEN 1
           ELSE 0
         END ASC,
         a.due_date ASC,
         a.id DESC`,
      [studentId]
    );

    return res.status(200).json({
      success: true,
      assignments,
      totalAssignments: assignments.length,
    });
  } catch (error) {
    next(error);
  }
}
module.exports = {
  getMyCourses,
  getCourseDetails,
  getCourseModules,
  getMyAssignments,
};