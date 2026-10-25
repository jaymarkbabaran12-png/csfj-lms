function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// GET /api/admin/assignments
async function getAdminAssignments(req, res, next) {
  try {
    const db = req.app.locals.db;
    const search = cleanString(req.query.search);
    const status = cleanString(req.query.status).toLowerCase();

    const conditions = [];
    const params = [];

    if (search) {
      const keyword = `%${search}%`;

      conditions.push(`(
        a.title LIKE ?
        OR c.course_code LIKE ?
        OR c.course_name LIKE ?
        OR instructor.full_name LIKE ?
        OR instructor.username LIKE ?
      )`);

      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    if (status === "upcoming") {
      conditions.push("(a.due_date IS NOT NULL AND a.due_date >= NOW())");
    } else if (status === "overdue") {
      conditions.push("(a.due_date IS NOT NULL AND a.due_date < NOW())");
    } else if (status === "no_deadline") {
      conditions.push("(a.due_date IS NULL)");
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await db.execute(
      `SELECT
         a.id,
         a.course_id,
         a.module_id,
         a.title,
         a.description,
         a.due_date,
         a.points,
         a.created_at,
         c.course_code,
         c.course_name,
         instructor.full_name AS instructor_name,
         instructor.username AS instructor_username,
         m.title AS module_title,
         COUNT(DISTINCT s.id) AS total_submissions,
         COUNT(DISTINCT s.student_id) AS students_submitted,
         COUNT(DISTINCT CASE
           WHEN s.graded_at IS NOT NULL THEN s.id
         END) AS graded_submissions
       FROM assignments a
       INNER JOIN courses c ON c.id = a.course_id
       LEFT JOIN users instructor ON instructor.id = c.instructor_id
       LEFT JOIN modules m ON m.id = a.module_id
       LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
       ${whereClause}
       GROUP BY
         a.id, a.course_id, a.module_id, a.title, a.description,
         a.due_date, a.points, a.created_at, c.course_code,
         c.course_name, instructor.full_name, instructor.username,
         m.title
       ORDER BY a.created_at DESC, a.id DESC`,
      params
    );

    const assignments = rows.map((row) => {
      const isOverdue =
        row.due_date !== null &&
        new Date(row.due_date).getTime() < Date.now();

      return {
        ...row,
        points: Number(row.points ?? 100),
        total_submissions: Number(row.total_submissions),
        students_submitted: Number(row.students_submitted),
        graded_submissions: Number(row.graded_submissions),
        status:
          row.due_date === null
            ? "No deadline"
            : isOverdue
              ? "Overdue"
              : "Upcoming",
      };
    });

    return res.json({
      success: true,
      total: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/assignments/stats
async function getAdminAssignmentStats(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [rows] = await db.execute(`
      SELECT
        COUNT(DISTINCT a.id) AS total_assignments,
        COUNT(DISTINCT CASE
          WHEN a.due_date IS NOT NULL AND a.due_date >= NOW()
          THEN a.id
        END) AS upcoming_assignments,
        COUNT(DISTINCT CASE
          WHEN a.due_date IS NOT NULL AND a.due_date < NOW()
          THEN a.id
        END) AS overdue_assignments,
        COUNT(DISTINCT s.id) AS total_submissions,
        COUNT(DISTINCT CASE
          WHEN s.graded_at IS NOT NULL THEN s.id
        END) AS graded_submissions
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
    `);

    const stats = rows[0];

    return res.json({
      success: true,
      stats: {
        totalAssignments: Number(stats.total_assignments),
        upcomingAssignments: Number(stats.upcoming_assignments),
        overdueAssignments: Number(stats.overdue_assignments),
        totalSubmissions: Number(stats.total_submissions),
        gradedSubmissions: Number(stats.graded_submissions),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminAssignments,
  getAdminAssignmentStats,
};
