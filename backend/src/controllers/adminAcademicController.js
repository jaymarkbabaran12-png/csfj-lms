const VALID_YEAR_LEVELS = [1, 2, 3, 4];
const VALID_SEMESTERS = [1, 2];

function validateSubject(body) {
  const programId = Number(body.program_id);
  const subjectCode =
    typeof body.subject_code === "string"
      ? body.subject_code.trim()
      : "";
  const subjectName =
    typeof body.subject_name === "string"
      ? body.subject_name.trim()
      : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";
  const yearLevel = Number(body.year_level);
  const semester = Number(body.semester);
  const units = Number(body.units);

const subjectType =
  typeof body.subject_type === "string"
    ? body.subject_type.trim()
    : "";

if (!["Major", "Minor"].includes(subjectType)) {
  return {
    error: "Subject type must be Major or Minor.",
  };
}
  if (!Number.isSafeInteger(programId) || programId < 1) {
    return { error: "Please select a valid academic program." };
  }

  if (!subjectCode || subjectCode.length > 50) {
    return {
      error: "Subject code is required and must not exceed 50 characters.",
    };
  }

  if (!subjectName || subjectName.length > 255) {
    return {
      error: "Subject name is required and must not exceed 255 characters.",
    };
  }

  if (!VALID_YEAR_LEVELS.includes(yearLevel)) {
    return { error: "Year level must be between 1 and 4." };
  }

  if (!VALID_SEMESTERS.includes(semester)) {
    return { error: "Semester must be 1 or 2." };
  }

  if (!Number.isFinite(units) || units <= 0 || units > 30) {
    return { error: "Units must be greater than 0 and not exceed 30." };
  }

  return {
    value: {
      programId,
      subjectCode,
      subjectName,
      description: description || null,
      yearLevel,
      semester,
      units,
      subjectType,
    },
  };
}

async function getAcademicProgramsAdmin(req, res, next) {
  try {
    const db = req.app.locals.db;

    const [programs] = await db.execute(`
      SELECT
        ap.id,
        ap.program_code,
        ap.program_name,
        ap.description,
        COUNT(cs.id) AS subject_count
      FROM academic_programs ap
      LEFT JOIN curriculum_subjects cs
        ON cs.program_id = ap.id
      GROUP BY
        ap.id,
        ap.program_code,
        ap.program_name,
        ap.description
      ORDER BY ap.program_name ASC
    `);

    return res.json({
      success: true,
      programs,
    });
  } catch (error) {
    next(error);
  }
}

async function createCurriculumSubject(req, res, next) {
  try {
    const db = req.app.locals.db;
    const validation = validateSubject(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const subject = validation.value;

    const [programs] = await db.execute(
      "SELECT id FROM academic_programs WHERE id = ? LIMIT 1",
      [subject.programId]
    );

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic program not found.",
      });
    }

    const [result] = await db.execute(
  `INSERT INTO curriculum_subjects
    (
      program_id,
      subject_code,
      subject_name,
      description,
      year_level,
      semester,
      subject_type,
      units
    )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    subject.programId,
    subject.subjectCode,
    subject.subjectName,
    subject.description,
    subject.yearLevel,
    subject.semester,
    subject.subjectType,
    subject.units,
  ]
);

    return res.status(201).json({
      success: true,
      message: "Curriculum subject created successfully.",
      subject: {
        id: result.insertId,
        ...subject,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A duplicate subject code already exists.",
      });
    }

    next(error);
  }
}

async function updateCurriculumSubject(req, res, next) {
  try {
    const db = req.app.locals.db;
    const subjectId = Number(req.params.id);
    const validation = validateSubject(req.body);

    if (!Number.isSafeInteger(subjectId) || subjectId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const subject = validation.value;

    const [existing] = await db.execute(
      "SELECT id FROM curriculum_subjects WHERE id = ? LIMIT 1",
      [subjectId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Curriculum subject not found.",
      });
    }

    const [programs] = await db.execute(
      "SELECT id FROM academic_programs WHERE id = ? LIMIT 1",
      [subject.programId]
    );

    if (programs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Academic program not found.",
      });
    }

    await db.execute(
  `UPDATE curriculum_subjects
   SET
     program_id = ?,
     subject_code = ?,
     subject_name = ?,
     description = ?,
     year_level = ?,
     semester = ?,
     subject_type = ?,
     units = ?
   WHERE id = ?`,
  [
    subject.programId,
    subject.subjectCode,
    subject.subjectName,
    subject.description,
    subject.yearLevel,
    subject.semester,
    subject.subjectType,
    subject.units,
    subjectId,
  ]
);

    return res.json({
      success: true,
      message: "Curriculum subject updated successfully.",
      subject: {
        id: subjectId,
        ...subject,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A duplicate subject code already exists.",
      });
    }

    next(error);
  }
}

async function deleteCurriculumSubject(req, res, next) {
  try {
    const db = req.app.locals.db;
    const subjectId = Number(req.params.id);

    if (!Number.isSafeInteger(subjectId) || subjectId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM curriculum_subjects WHERE id = ?",
      [subjectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Curriculum subject not found.",
      });
    }

    return res.json({
      success: true,
      message: "Curriculum subject deleted successfully.",
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "This subject is referenced by other records and cannot be deleted.",
      });
    }

    next(error);
  }
}

module.exports = {
  getAcademicProgramsAdmin,
  createCurriculumSubject,
  updateCurriculumSubject,
  deleteCurriculumSubject,
};
