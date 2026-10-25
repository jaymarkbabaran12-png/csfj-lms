const getDb = (req) => req.app.locals.db;

// GET /api/admin/reports/overview
exports.getReportsOverview = async (req, res) => {
  try {
    const db = getDb(req);

    const [rows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') AS total_instructors,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
        (SELECT COUNT(*) FROM courses) AS total_courses,
        (SELECT COUNT(*) FROM course_enrollments) AS total_enrollments,
        (SELECT COUNT(*) FROM course_enrollments
          WHERE enrollment_status = 'active') AS active_enrollments,
        (SELECT COUNT(*) FROM assignments) AS total_assignments,
        (SELECT COUNT(*) FROM quizzes) AS total_quizzes,
        (SELECT COUNT(*) FROM grades) AS total_grade_records
    `);

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Reports overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load reports overview.",
    });
  }
};

// GET /api/admin/reports/users
exports.getUserReports = async (req, res) => {
  try {
    const db = getDb(req);

    const [rows] = await db.query(`
      SELECT
        id,
        username,
        full_name,
        email,
        role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    const [summary] = await db.query(`
      SELECT role, COUNT(*) AS total
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    res.json({
      success: true,
      summary,
      data: rows,
    });
  } catch (error) {
    console.error("User reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load user reports.",
    });
  }
};

// GET /api/admin/reports/enrollments
exports.getEnrollmentReports = async (req, res) => {
  try {
    const db = getDb(req);

    const [summary] = await db.query(`
      SELECT
        enrollment_status,
        COUNT(*) AS total
      FROM course_enrollments
      GROUP BY enrollment_status
      ORDER BY enrollment_status
    `);

    const [rows] = await db.query(`
      SELECT
        ce.id,
        ce.enrollment_status,
        ce.enrolled_at,
        u.id AS student_id,
        u.full_name AS student_name,
        u.username,
        c.course_code,
        c.course_name
      FROM course_enrollments ce
      LEFT JOIN users u ON u.id = ce.student_id
      LEFT JOIN courses c ON c.id = ce.course_id
      ORDER BY ce.enrolled_at DESC
    `);

    res.json({
      success: true,
      summary,
      data: rows,
    });
  } catch (error) {
    console.error("Enrollment reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load enrollment reports.",
    });
  }
};

// GET /api/admin/reports/academic
exports.getAcademicReports = async (req, res) => {
  try {
    const db = getDb(req);

    const [courses] = await db.query(`
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.created_at,
        u.full_name AS instructor_name,
        (SELECT COUNT(*)
          FROM course_enrollments ce
          WHERE ce.course_id = c.id) AS enrollment_count,
        (SELECT COUNT(*)
          FROM assignments a
          WHERE a.course_id = c.id) AS assignment_count,
        (SELECT COUNT(*)
          FROM quizzes q
          WHERE q.course_id = c.id) AS quiz_count
      FROM courses c
      LEFT JOIN users u ON u.id = c.instructor_id
      ORDER BY c.course_name
    `);

    const [summary] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM courses) AS total_courses,
        (SELECT COUNT(*) FROM modules) AS total_modules,
        (SELECT COUNT(*) FROM assignments) AS total_assignments,
        (SELECT COUNT(*) FROM quizzes) AS total_quizzes,
        (SELECT COUNT(*) FROM quiz_questions) AS total_quiz_questions
    `);

    res.json({
      success: true,
      summary: summary[0],
      data: courses,
    });
  } catch (error) {
    console.error("Academic reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load academic reports.",
    });
  }
};

// GET /api/admin/reports/performance
exports.getPerformanceReports = async (req, res) => {
  try {
    const db = getDb(req);

    const [summary] = await db.query(`
      SELECT
        COUNT(*) AS total_grade_records,
        ROUND(AVG(assignment_score), 2) AS average_assignment_score,
        ROUND(AVG(quiz_score), 2) AS average_quiz_score,
        ROUND(AVG(final_grade), 2) AS average_final_grade,
        SUM(CASE WHEN final_grade IS NOT NULL THEN 1 ELSE 0 END)
          AS graded_records
      FROM grades
    `);

    const [rows] = await db.query(`
      SELECT
        g.id,
        g.assignment_score,
        g.quiz_score,
        g.final_grade,
        g.remarks,
        g.created_at,
        u.full_name AS student_name,
        u.username,
        c.course_code,
        c.course_name
      FROM grades g
      LEFT JOIN users u ON u.id = g.student_id
      LEFT JOIN courses c ON c.id = g.course_id
      ORDER BY g.created_at DESC
    `);

    res.json({
      success: true,
      summary: summary[0],
      data: rows,
    });
  } catch (error) {
    console.error("Performance reports error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load performance reports.",
    });
  }
};
