const fs = require("fs");
const path = require("path");
const { trySyncStudentGradesToHub } = require("../services/hubGradeSync");

const UPLOAD_DIR = path.resolve(__dirname, "../../uploads/learning-materials");

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function cleanText(value, maxLength = 20000) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function validDate(value) {
  return typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value));
}

async function getEnrolledStudent(db, studentNumber, courseId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.student_id, u.full_name
     FROM users u
     INNER JOIN course_enrollments ce
       ON ce.student_id = u.id
      AND ce.course_id = ?
      AND ce.enrollment_status = 'active'
     WHERE u.student_id = ?
       AND u.role = 'student'
     LIMIT 1`,
    [courseId, studentNumber]
  );

  return rows[0] || null;
}

async function getCourseContent(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = positiveId(req.params.courseId);
    const studentNumber = String(req.params.studentNumber || "").trim();

    if (!courseId || !studentNumber) {
      return res.status(400).json({ success: false, message: "Invalid course or student number." });
    }

    const [courses] = await db.execute(
      `SELECT id, course_code, course_name, description
       FROM courses WHERE id = ? LIMIT 1`,
      [courseId]
    );
    if (!courses.length) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const student = await getEnrolledStudent(db, studentNumber, courseId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Student is not actively enrolled in this course." });
    }

    const [modules] = await db.execute(
      `SELECT id, title, description, module_order
       FROM modules WHERE course_id = ? ORDER BY module_order, id`,
      [courseId]
    );
    const moduleIds = modules.map((module) => module.id);
    let materials = [];
    if (moduleIds.length) {
      const placeholders = moduleIds.map(() => "?").join(",");
      const [rows] = await db.execute(
        `SELECT id, module_id, title, description, material_type,
                original_filename, mime_type, file_size, material_url, created_at,
                CASE WHEN stored_filename IS NOT NULL THEN 1 ELSE 0 END AS is_file
         FROM learning_materials
         WHERE module_id IN (${placeholders})
         ORDER BY id`,
        moduleIds
      );
      materials = rows.map((material) => ({
        ...material,
        download_url: material.is_file
          ? `/api/integration/materials/${material.id}/download`
          : material.material_url,
      }));
    }

    const [assignments] = await db.execute(
      `SELECT a.id, a.course_id, a.module_id, a.title, a.description,
              a.due_date, a.points, s.submitted_at
       FROM assignments a
       LEFT JOIN assignment_submissions s
         ON s.assignment_id = a.id AND s.student_id = ?
       WHERE a.course_id = ?
       ORDER BY a.due_date, a.id`,
      [student.id, courseId]
    );

    const [quizzes] = await db.execute(
      `SELECT q.id, q.course_id, q.module_id, q.title, q.description,
              q.total_points, d.due_date, s.submitted_at
       FROM quizzes q
       LEFT JOIN hub_quiz_deadlines d ON d.quiz_id = q.id
       LEFT JOIN hub_quiz_submissions s
         ON s.quiz_id = q.id AND s.student_id = ?
       WHERE q.course_id = ?
       ORDER BY d.due_date, q.id`,
      [student.id, courseId]
    );

    const quizIds = quizzes.map((quiz) => quiz.id);
    let questions = [];
    if (quizIds.length) {
      const quizPlaceholders = quizIds.map(() => "?").join(",");
      const [questionRows] = await db.execute(
        `SELECT id, quiz_id, question_text, points, question_order
         FROM quiz_questions WHERE quiz_id IN (${quizPlaceholders})
         ORDER BY question_order, id`,
        quizIds
      );
      const questionIds = questionRows.map((question) => question.id);
      let choices = [];
      if (questionIds.length) {
        const questionPlaceholders = questionIds.map(() => "?").join(",");
        const [choiceRows] = await db.execute(
          `SELECT id, question_id, choice_text
           FROM quiz_choices WHERE question_id IN (${questionPlaceholders})
           ORDER BY id`,
          questionIds
        );
        choices = choiceRows;
      }
      questions = questionRows.map((question) => ({
        ...question,
        points: Number(question.points),
        choices: choices
          .filter((choice) => choice.question_id === question.id)
          .map(({ id, choice_text }) => ({ id, text: choice_text })),
      }));
    }

    return res.json({
      success: true,
      course: courses[0],
      student: { student_id: student.student_id, full_name: student.full_name },
      modules: modules.map((module) => ({
        ...module,
        materials: materials.filter((material) => material.module_id === module.id),
      })),
      assignments,
      quizzes: quizzes.map((quiz) => ({
        ...quiz,
        total_points: Number(quiz.total_points),
        questions: questions.filter((question) => question.quiz_id === quiz.id),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function downloadMaterial(req, res, next) {
  try {
    const db = req.app.locals.db;
    const materialId = positiveId(req.params.materialId);
    if (!materialId) {
      return res.status(400).json({ success: false, message: "Invalid material ID." });
    }

    const [rows] = await db.execute(
      `SELECT lm.stored_filename, lm.original_filename
       FROM learning_materials lm
       INNER JOIN modules m ON m.id = lm.module_id
       WHERE lm.id = ? AND lm.stored_filename IS NOT NULL
       LIMIT 1`,
      [materialId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Learning material not found." });
    }

    const filename = rows[0].stored_filename;
    if (!/^[a-f0-9-]+\.(pdf|doc|docx|ppt|pptx)$/i.test(filename || "")) {
      return res.status(404).json({ success: false, message: "Learning material file not found." });
    }

    const filePath = path.resolve(UPLOAD_DIR, filename);
    if (!filePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
      return res.status(404).json({ success: false, message: "Learning material file not found." });
    }

    return res.download(filePath, path.basename(rows[0].original_filename || "learning-material"), (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
}

async function createAssignment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = positiveId(req.params.courseId);
    const instructorId = positiveId(req.body.instructor_id);
    const title = cleanText(req.body.title, 255);
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const points = req.body.points === undefined ? 100 : Number(req.body.points);
    const moduleId = req.body.module_id == null || req.body.module_id === "" ? null : positiveId(req.body.module_id);
    const dueDate = req.body.due_date == null || req.body.due_date === "" ? null : req.body.due_date;

    if (!courseId || !instructorId || !title || description.length > 20000 ||
        !Number.isSafeInteger(points) || points < 1 || points > 100000 ||
        (req.body.module_id != null && req.body.module_id !== "" && !moduleId) ||
        (dueDate && !validDate(dueDate))) {
      return res.status(400).json({ success: false, message: "Invalid assignment details." });
    }

    const [courses] = await db.execute(
      `SELECT id FROM courses WHERE id = ? AND instructor_id = ? LIMIT 1`,
      [courseId, instructorId]
    );
    if (!courses.length) {
      return res.status(403).json({ success: false, message: "Instructor does not own this course." });
    }
    if (moduleId) {
      const [modules] = await db.execute(
        `SELECT id FROM modules WHERE id = ? AND course_id = ? LIMIT 1`,
        [moduleId, courseId]
      );
      if (!modules.length) {
        return res.status(400).json({ success: false, message: "Module does not belong to this course." });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO assignments (course_id, module_id, title, description, due_date, points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, moduleId, title, description || null, dueDate, points]
    );
    return res.status(201).json({ success: true, assignment_id: result.insertId });
  } catch (error) {
    next(error);
  }
}

async function createQuiz(req, res, next) {
  let connection;
  try {
    const courseId = positiveId(req.params.courseId);
    const instructorId = positiveId(req.body.instructor_id);
    const moduleId = req.body.module_id == null || req.body.module_id === "" ? null : positiveId(req.body.module_id);
    const title = cleanText(req.body.title, 255);
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const totalPoints = Number(req.body.total_points ?? 100);
    const dueDate = req.body.due_date;
    const questions = req.body.questions;

    if (!courseId || !instructorId || !title || description.length > 20000 ||
        !Number.isFinite(totalPoints) || totalPoints <= 0 || !validDate(dueDate) ||
        !Array.isArray(questions) || questions.length < 1 || questions.length > 100 ||
        (req.body.module_id != null && req.body.module_id !== "" && !moduleId)) {
      return res.status(400).json({ success: false, message: "Invalid quiz details or questions." });
    }

    const normalizedQuestions = [];
    for (const question of questions) {
      const questionText = cleanText(question.question_text, 5000);
      const points = Number(question.points ?? 1);
      const choices = question.choices;
      if (!questionText || !Number.isFinite(points) || points <= 0 ||
          !Array.isArray(choices) || choices.length < 2 || choices.length > 20 ||
          choices.some((choice) => !cleanText(choice.text, 1000)) ||
          choices.filter((choice) => choice.is_correct === true).length !== 1) {
        return res.status(400).json({ success: false, message: "Each question needs 2-20 choices and exactly one correct choice." });
      }
      normalizedQuestions.push({ questionText, points, choices });
    }
    if (normalizedQuestions.reduce((sum, question) => sum + question.points, 0) > totalPoints) {
      return res.status(400).json({ success: false, message: "Question points cannot exceed total quiz points." });
    }

    connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    const [courses] = await connection.execute(
      `SELECT id FROM courses WHERE id = ? AND instructor_id = ? LIMIT 1`,
      [courseId, instructorId]
    );
    if (!courses.length) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Instructor does not own this course." });
    }
    if (moduleId) {
      const [modules] = await connection.execute(
        `SELECT id FROM modules WHERE id = ? AND course_id = ? LIMIT 1`,
        [moduleId, courseId]
      );
      if (!modules.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "Module does not belong to this course." });
      }
    }

    const [quizResult] = await connection.execute(
      `INSERT INTO quizzes (course_id, module_id, title, description, total_points)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, moduleId, title, description || null, totalPoints]
    );
    await connection.execute(
      `INSERT INTO hub_quiz_deadlines (quiz_id, due_date) VALUES (?, ?)`,
      [quizResult.insertId, dueDate]
    );

    for (const [index, question] of normalizedQuestions.entries()) {
      const [questionResult] = await connection.execute(
        `INSERT INTO quiz_questions (quiz_id, question_text, points, question_order)
         VALUES (?, ?, ?, ?)`,
        [quizResult.insertId, question.questionText, question.points, index + 1]
      );
      for (const choice of question.choices) {
        await connection.execute(
          `INSERT INTO quiz_choices (question_id, choice_text, is_correct)
           VALUES (?, ?, ?)`,
          [questionResult.insertId, choice.text.trim(), choice.is_correct === true ? 1 : 0]
        );
      }
    }

    await connection.commit();
    return res.status(201).json({ success: true, quiz_id: quizResult.insertId });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

async function submitAssignment(req, res, next) {
  try {
    const db = req.app.locals.db;
    const assignmentId = positiveId(req.params.assignmentId);
    const studentNumber = typeof req.body.student_number === "string" ? req.body.student_number.trim() : "";
    const submissionText = cleanText(req.body.submission_text);
    if (!assignmentId || !studentNumber || !submissionText) {
      return res.status(400).json({ success: false, message: "Assignment, student number, and submission text are required." });
    }

    const [assignments] = await db.execute(
      `SELECT id, course_id, due_date FROM assignments WHERE id = ? LIMIT 1`,
      [assignmentId]
    );
    if (!assignments.length) return res.status(404).json({ success: false, message: "Assignment not found." });
    const assignment = assignments[0];
    const student = await getEnrolledStudent(db, studentNumber, assignment.course_id);
    if (!student) return res.status(403).json({ success: false, message: "Student is not actively enrolled in this course." });
    if (assignment.due_date && new Date(assignment.due_date).getTime() < Date.now()) {
      return res.status(409).json({ success: false, message: "Assignment deadline has passed." });
    }

    const [existing] = await db.execute(
      `SELECT id, graded_at FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ? LIMIT 1`,
      [assignmentId, student.id]
    );
    if (existing.length && existing[0].graded_at) {
      return res.status(409).json({ success: false, message: "This submission has already been graded." });
    }
    if (existing.length) {
      await db.execute(
        `UPDATE assignment_submissions
         SET submission_text = ?, submitted_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [submissionText, existing[0].id]
      );
      return res.json({ success: true, submission_id: existing[0].id, updated: true });
    }

    const [result] = await db.execute(
      `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submitted_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [assignmentId, student.id, submissionText]
    );
    return res.status(201).json({ success: true, submission_id: result.insertId });
  } catch (error) {
    next(error);
  }
}

async function submitQuiz(req, res, next) {
  let connection;
  try {
    const quizId = positiveId(req.params.quizId);
    const studentNumber = typeof req.body.student_number === "string" ? req.body.student_number.trim() : "";
    const answers = req.body.answers;
    if (!quizId || !studentNumber || !Array.isArray(answers) || answers.length < 1 || answers.length > 100) {
      return res.status(400).json({ success: false, message: "Quiz, student number, and answers are required." });
    }
    const questionIds = answers.map((answer) => positiveId(answer.question_id));
    const choiceIds = answers.map((answer) => positiveId(answer.choice_id));
    if (questionIds.some((id) => !id) || choiceIds.some((id) => !id) || new Set(questionIds).size !== answers.length) {
      return res.status(400).json({ success: false, message: "Answers must contain one valid choice per question." });
    }

    connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    const [quizzes] = await connection.execute(
      `SELECT q.id, q.course_id, d.due_date
       FROM quizzes q LEFT JOIN hub_quiz_deadlines d ON d.quiz_id = q.id
       WHERE q.id = ? LIMIT 1 FOR UPDATE`,
      [quizId]
    );
    if (!quizzes.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    const quiz = quizzes[0];
    const student = await getEnrolledStudent(connection, studentNumber, quiz.course_id);
    if (!student) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Student is not actively enrolled in this course." });
    }
    if (!quiz.due_date || new Date(quiz.due_date).getTime() < Date.now()) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "Quiz deadline has passed or is not configured." });
    }

    const [priorSubmissions] = await connection.execute(
      `SELECT id FROM hub_quiz_submissions WHERE quiz_id = ? AND student_id = ? LIMIT 1`,
      [quizId, student.id]
    );
    if (priorSubmissions.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "Quiz has already been submitted." });
    }

    const [questions] = await connection.execute(
      `SELECT id, points FROM quiz_questions WHERE quiz_id = ?`,
      [quizId]
    );
    if (questions.length !== answers.length || questions.some((question) => !questionIds.includes(question.id))) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Submit exactly one answer for every quiz question." });
    }

    const questionMap = new Map(questions.map((question) => [Number(question.id), Number(question.points)]));
    let score = 0;
    for (const [index, answer] of answers.entries()) {
      const [choices] = await connection.execute(
        `SELECT id, is_correct FROM quiz_choices WHERE id = ? AND question_id = ? LIMIT 1`,
        [choiceIds[index], questionIds[index]]
      );
      if (!choices.length) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "A selected choice does not belong to its question." });
      }
      if (choices[0].is_correct) score += questionMap.get(questionIds[index]);
    }

    const [submissionResult] = await connection.execute(
      `INSERT INTO hub_quiz_submissions (quiz_id, student_id, score)
       VALUES (?, ?, ?)`,
      [quizId, student.id, score]
    );
    for (const [index, answer] of answers.entries()) {
      await connection.execute(
        `INSERT INTO hub_quiz_submission_answers (submission_id, question_id, choice_id)
         VALUES (?, ?, ?)`,
        [submissionResult.insertId, questionIds[index], choiceIds[index]]
      );
    }
    await connection.commit();
    const hubGradeSync = await trySyncStudentGradesToHub(
      req.app.locals.db,
      student.id
    );
    return res.status(201).json({
      success: true,
      submission_id: submissionResult.insertId,
      score,
      hub_grade_sync: hubGradeSync.status,
    });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  getCourseContent,
  downloadMaterial,
  createAssignment,
  createQuiz,
  submitAssignment,
  submitQuiz,
};