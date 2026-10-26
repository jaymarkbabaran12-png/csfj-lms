const HUB_GRADES_URL =
  process.env.HUB_STUDENT_RECORDS_API_URL ||
  "https://it-department-hub.onrender.com/api/students";

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function syncStudentGradesToHub(db, internalStudentId) {
  const apiKey = process.env.HUB_STUDENT_RECORDS_API_KEY;
  if (!apiKey) {
    return { status: "not_configured" };
  }

  const [students] = await db.execute(
    `SELECT student_id
     FROM users
     WHERE id = ? AND role = 'student'
     LIMIT 1`,
    [internalStudentId]
  );
  if (!students.length || !students[0].student_id) {
    return { status: "no_student_number" };
  }

  const [gradeRows] = await db.execute(
    `SELECT
       c.course_code AS subject_code,
       c.course_name AS subject_name,
       ROUND(SUM(g.earned_points) / NULLIF(SUM(g.possible_points), 0) * 100, 2) AS grade
     FROM (
       SELECT
         ass.student_id,
         a.course_id,
         ass.score AS earned_points,
         a.points AS possible_points
       FROM assignment_submissions ass
       INNER JOIN assignments a ON a.id = ass.assignment_id
       WHERE ass.graded_at IS NOT NULL
         AND ass.score IS NOT NULL
         AND a.points > 0

       UNION ALL

       SELECT
         hs.student_id,
         q.course_id,
         hs.score AS earned_points,
         q.total_points AS possible_points
       FROM hub_quiz_submissions hs
       INNER JOIN quizzes q ON q.id = hs.quiz_id
       WHERE q.total_points > 0
     ) g
     INNER JOIN courses c ON c.id = g.course_id
     WHERE g.student_id = ?
     GROUP BY c.id, c.course_code, c.course_name
     ORDER BY c.course_code`,
    [internalStudentId]
  );

  const localGrades = gradeRows.map((row) => ({
    subject_code: row.subject_code,
    subject_name: row.subject_name,
    grade: Number(row.grade),
    remarks: "Calculated from graded LMS assignments and quizzes.",
  }));

  if (!localGrades.length) {
    return { status: "no_graded_subjects" };
  }

  const studentId = encodeURIComponent(String(students[0].student_id));
  const endpoint = `${HUB_GRADES_URL.replace(/\/$/, "")}/${studentId}/grades`;
  const requestOptions = {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  };

  const existingResponse = await fetch(endpoint, requestOptions);
  const existingData = await readJson(existingResponse);
  if (!existingResponse.ok) {
    throw new Error(`Hub grade retrieval failed with HTTP ${existingResponse.status}.`);
  }

  const existingGrades = Array.isArray(existingData)
    ? existingData
    : existingData && Array.isArray(existingData.grades)
      ? existingData.grades
      : null;
  if (!existingGrades) {
    throw new Error("Hub grade retrieval returned an unsupported response format.");
  }

  const gradesBySubject = new Map(
    existingGrades
      .filter((grade) => grade && typeof grade.subject_code === "string")
      .map((grade) => [grade.subject_code, grade])
  );
  for (const grade of localGrades) {
    gradesBySubject.set(grade.subject_code, {
      ...gradesBySubject.get(grade.subject_code),
      ...grade,
    });
  }

  const uploadResponse = await fetch(endpoint, {
    ...requestOptions,
    method: "PUT",
    body: JSON.stringify([...gradesBySubject.values()]),
  });
  if (!uploadResponse.ok) {
    throw new Error(`Hub grade upload failed with HTTP ${uploadResponse.status}.`);
  }

  return { status: "synced" };
}

async function trySyncStudentGradesToHub(db, internalStudentId) {
  try {
    return await syncStudentGradesToHub(db, internalStudentId);
  } catch (error) {
    console.error("Hub grade sync failed:", error.message);
    return { status: "pending" };
  }
}

module.exports = { trySyncStudentGradesToHub };