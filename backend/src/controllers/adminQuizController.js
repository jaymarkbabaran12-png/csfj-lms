function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// GET /api/admin/quizzes/stats
async function getAdminQuizStats(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [quizRows] = await db.execute(`
      SELECT
        COUNT(*) AS total_quizzes,
        COUNT(DISTINCT course_id) AS courses_with_quizzes,
        COALESCE(SUM(total_points), 0) AS total_points
      FROM quizzes
    `);

    const [questionRows] = await db.execute(`
      SELECT COUNT(*) AS total_questions
      FROM quiz_questions
    `);

    return res.json({
      success: true,
      stats: {
        totalQuizzes: Number(quizRows[0].total_quizzes),
        coursesWithQuizzes: Number(quizRows[0].courses_with_quizzes),
        totalPoints: Number(quizRows[0].total_points),
        totalQuestions: Number(questionRows[0].total_questions),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/quizzes
async function getAdminQuizzes(req, res, next) {
  try {
    const db = req.app.locals.db;
    const search = cleanString(req.query.search);

    const params = [];
    let whereClause = "";

    if (search) {
      whereClause = `
        WHERE q.title LIKE ?
           OR q.description LIKE ?
           OR c.course_code LIKE ?
           OR c.course_name LIKE ?
      `;

      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword, keyword);
    }

    const [rows] = await db.execute(
      `SELECT
         q.id,
         q.course_id,
         q.module_id,
         q.title,
         q.description,
         q.total_points,
         q.created_at,
         c.course_code,
         c.course_name,
         m.title AS module_title,
         COUNT(DISTINCT qq.id) AS question_count
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       LEFT JOIN modules m ON m.id = q.module_id
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       ${whereClause}
       GROUP BY
         q.id, q.course_id, q.module_id, q.title,
         q.description, q.total_points, q.created_at,
         c.course_code, c.course_name, m.title
       ORDER BY q.created_at DESC, q.id DESC`,
      params
    );

    return res.json({
      success: true,
      total: rows.length,
      quizzes: rows.map((quiz) => ({
        ...quiz,
        total_points: Number(quiz.total_points ?? 0),
        question_count: Number(quiz.question_count ?? 0),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/quiz-options
async function getAdminQuizOptions(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [courses] = await db.execute(`
      SELECT id, course_code, course_name
      FROM courses
      ORDER BY course_code, course_name
    `);

    const [modules] = await db.execute(`
      SELECT id, course_id, title
      FROM modules
      ORDER BY course_id, title
    `);

    return res.json({
      success: true,
      courses,
      modules,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/quizzes
async function createAdminQuiz(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = Number(req.body.course_id);
    const moduleId =
      req.body.module_id === "" ||
      req.body.module_id === null ||
      req.body.module_id === undefined
        ? null
        : Number(req.body.module_id);

    const title = cleanString(req.body.title);
    const description = cleanString(req.body.description);
    const totalPoints = Number(req.body.total_points ?? 100);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Pumili ng valid na course.",
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Kailangan ang quiz title.",
      });
    }

    if (!Number.isFinite(totalPoints) || totalPoints < 0) {
      return res.status(400).json({
        success: false,
        message: "Ang total points ay dapat zero o mas mataas.",
      });
    }

    if (
      moduleId !== null &&
      (!Number.isInteger(moduleId) || moduleId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ang napiling module.",
      });
    }

    const [courseRows] = await db.execute(
      "SELECT id FROM courses WHERE id = ?",
      [courseId]
    );

    if (!courseRows.length) {
      return res.status(400).json({
        success: false,
        message: "Hindi makita ang napiling course.",
      });
    }

    if (moduleId !== null) {
      const [moduleRows] = await db.execute(
        "SELECT id FROM modules WHERE id = ? AND course_id = ?",
        [moduleId, courseId]
      );

      if (!moduleRows.length) {
        return res.status(400).json({
          success: false,
          message: "Ang module ay hindi kabilang sa napiling course.",
        });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO quizzes
         (course_id, module_id, title, description, total_points)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, moduleId, title, description || null, totalPoints]
    );

    return res.status(201).json({
      success: true,
      message: "Matagumpay na nagawa ang quiz.",
      quiz: {
        id: result.insertId,
        course_id: courseId,
        module_id: moduleId,
        title,
        description,
        total_points: totalPoints,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/quizzes/:id
async function getAdminQuizDetails(req, res, next) {
  try {
    const db = req.app.locals.db;
    const quizId = Number(req.params.id);

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    const [quizRows] = await db.execute(
      `SELECT
         q.id, q.course_id, q.module_id, q.title,
         q.description, q.total_points, q.created_at,
         c.course_code, c.course_name, m.title AS module_title
       FROM quizzes q
       INNER JOIN courses c ON c.id = q.course_id
       LEFT JOIN modules m ON m.id = q.module_id
       WHERE q.id = ?`,
      [quizId]
    );

    if (!quizRows.length) {
      return res.status(404).json({
        success: false,
        message: "Hindi makita ang quiz.",
      });
    }

    const [questionRows] = await db.execute(
      `SELECT
         qq.id, qq.quiz_id, qq.question_text,
         qq.points, qq.question_order
       FROM quiz_questions qq
       WHERE qq.quiz_id = ?
       ORDER BY qq.question_order, qq.id`,
      [quizId]
    );

    const questionIds = questionRows.map((question) => question.id);
    let choiceRows = [];

    if (questionIds.length) {
      const placeholders = questionIds.map(() => "?").join(",");

      const [choices] = await db.execute(
        `SELECT id, question_id, choice_text, is_correct
         FROM quiz_choices
         WHERE question_id IN (${placeholders})
         ORDER BY id`,
        questionIds
      );

      choiceRows = choices;
    }

    const questions = questionRows.map((question) => ({
      ...question,
      points: Number(question.points ?? 1),
      choices: choiceRows
        .filter((choice) => choice.question_id === question.id)
        .map((choice) => ({
          ...choice,
          is_correct: Boolean(choice.is_correct),
        })),
    }));

    return res.json({
      success: true,
      quiz: {
        ...quizRows[0],
        total_points: Number(quizRows[0].total_points ?? 0),
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/quizzes/:id/questions
async function addAdminQuizQuestion(req, res, next) {
  let connection;

  try {
    const db = req.app.locals.db;
    const quizId = Number(req.params.id);
    const questionText = cleanString(req.body.question_text);
    const points = Number(req.body.points ?? 1);
    const choices = req.body.choices;

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    if (!questionText) {
      return res.status(400).json({
        success: false,
        message: "Ilagay ang question.",
      });
    }

    if (!Number.isFinite(points) || points <= 0) {
      return res.status(400).json({
        success: false,
        message: "Ang question points ay dapat mas mataas sa zero.",
      });
    }

    if (
      !Array.isArray(choices) ||
      choices.length < 2 ||
      choices.some((choice) => !cleanString(choice.text))
    ) {
      return res.status(400).json({
        success: false,
        message: "Maglagay ng hindi bababa sa dalawang valid na choices.",
      });
    }

    const correctCount = choices.filter(
      (choice) => choice.is_correct === true
    ).length;

    if (correctCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "Pumili ng eksaktong isang tamang sagot.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [quizRows] = await connection.execute(
      "SELECT id FROM quizzes WHERE id = ? FOR UPDATE",
      [quizId]
    );

    if (!quizRows.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Hindi makita ang quiz.",
      });
    }

    const [orderRows] = await connection.execute(
      `SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order
       FROM quiz_questions
       WHERE quiz_id = ?`,
      [quizId]
    );

    const [questionResult] = await connection.execute(
      `INSERT INTO quiz_questions
         (quiz_id, question_text, points, question_order)
       VALUES (?, ?, ?, ?)`,
      [quizId, questionText, points, orderRows[0].next_order]
    );

    for (const choice of choices) {
      await connection.execute(
        `INSERT INTO quiz_choices
           (question_id, choice_text, is_correct)
         VALUES (?, ?, ?)`,
        [
          questionResult.insertId,
          cleanString(choice.text),
          choice.is_correct === true ? 1 : 0,
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Matagumpay na naidagdag ang question at choices.",
      question_id: questionResult.insertId,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    next(error);
  } finally {
    if (connection) connection.release();
  }
}

// DELETE /api/admin/quizzes/:id
async function deleteAdminQuiz(req, res, next) {
  try {
    const db = req.app.locals.db;
    const quizId = Number(req.params.id);

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM quizzes WHERE id = ?",
      [quizId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Hindi makita ang quiz.",
      });
    }

    return res.json({
      success: true,
      message: "Matagumpay na nabura ang quiz.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminQuizStats,
  getAdminQuizzes,
  getAdminQuizOptions,
  createAdminQuiz,
  getAdminQuizDetails,
  addAdminQuizQuestion,
  deleteAdminQuiz,
};
