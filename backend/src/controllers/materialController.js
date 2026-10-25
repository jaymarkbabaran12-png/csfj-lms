const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/learning-materials"
);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function safeStoredPath(filename) {
  if (
    typeof filename !== "string" ||
    !/^[a-f0-9-]+\.(pdf|doc|docx|ppt|pptx)$/i.test(filename)
  ) {
    return null;
  }

  return path.join(UPLOAD_DIR, filename);
}

async function removeStoredFile(filename) {
  const filePath = safeStoredPath(filename);

  if (filePath) {
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }
}

function getExtension(filename) {
  return path.extname(filename || "").toLowerCase();
}

function validateUploadedFile(file) {
  if (!file) {
    return "Choose a document or PowerPoint file.";
  }

  const extension = getExtension(file.originalname);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return "Allowed file types: PDF, DOC, DOCX, PPT, and PPTX.";
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return "The uploaded file has an unsupported MIME type.";
  }

  if (!file.size || file.size > MAX_FILE_SIZE) {
    return "The file must be smaller than or equal to 20 MB.";
  }

  return null;
}

async function getOwnedModule(db, moduleId, instructorId) {
  const [rows] = await db.execute(
    `SELECT
       m.id,
       m.course_id,
       m.title AS module_title,
       c.course_name
     FROM modules m
     INNER JOIN courses c ON c.id = m.course_id
     WHERE m.id = ?
       AND c.instructor_id = ?
     LIMIT 1`,
    [moduleId, instructorId]
  );

  return rows[0] || null;
}

// GET /api/instructor/modules/:moduleId/materials
async function getModuleMaterials(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = validId(req.session.user.id);
    const moduleId = validId(req.params.moduleId);

    if (!instructorId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor or module ID.",
      });
    }

    const module = await getOwnedModule(db, moduleId, instructorId);

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found or not assigned to you.",
      });
    }

    const [materials] = await db.execute(
      `SELECT
         id,
         module_id,
         title,
         description,
         material_type,
         original_filename,
         mime_type,
         file_size,
         created_at
       FROM learning_materials
       WHERE module_id = ?
         AND stored_filename IS NOT NULL
       ORDER BY id DESC`,
      [moduleId]
    );

    return res.json({
      success: true,
      module,
      materials,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/instructor/modules/:moduleId/materials
async function uploadModuleMaterial(req, res, next) {
  let savedFilename = null;

  try {
    const db = req.app.locals.db;
    const instructorId = validId(req.session.user.id);
    const moduleId = validId(req.params.moduleId);

    if (!instructorId || !moduleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor or module ID.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded.",
      });
    }

    savedFilename = req.file.filename;

    const validationError = validateUploadedFile(req.file);

    if (validationError) {
      await removeStoredFile(savedFilename);
      savedFilename = null;

      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const module = await getOwnedModule(db, moduleId, instructorId);

    if (!module) {
      await removeStoredFile(savedFilename);
      savedFilename = null;

      return res.status(404).json({
        success: false,
        message: "Module not found or not assigned to you.",
      });
    }

    const originalFilename = path
      .basename(req.file.originalname)
      .replace(/[\r\n\0]/g, "")
      .slice(0, 255);

    const extension = getExtension(originalFilename);

    const title = originalFilename || `Uploaded file${extension}`;

    const [result] = await db.execute(
      `INSERT INTO learning_materials
       (
         module_id,
         title,
         description,
         material_type,
         material_url,
         original_filename,
         stored_filename,
         mime_type,
         file_size
       )
       VALUES (?, ?, NULL, 'document', NULL, ?, ?, ?, ?)`,
      [
        moduleId,
        title,
        originalFilename,
        savedFilename,
        req.file.mimetype,
        req.file.size,
      ]
    );

    // The material is saved successfully. Notification errors must not undo the upload.
    savedFilename = null;

    try {
      await db.execute(
        `INSERT INTO notifications
           (
             recipient_user_id,
             actor_user_id,
             notification_type,
             title,
             message,
             course_id,
             module_id,
             material_id
           )
         SELECT
           ce.student_id,
           ?,
           'material_uploaded',
           ?,
           ?,
           ?,
           ?,
           ?
         FROM course_enrollments ce
         WHERE ce.course_id = ?
           AND ce.enrollment_status = 'active'`,
        [
          instructorId,
          "New learning material",
          `${originalFilename} was uploaded to ${module.module_title || "your course module"}.`,
          module.course_id,
          moduleId,
          result.insertId,
          module.course_id,
        ]
      );
    } catch (notificationError) {
      console.error("Could not create student upload notifications:", notificationError);
    }

    const [rows] = await db.execute(
      `SELECT
         id,
         module_id,
         title,
         original_filename,
         mime_type,
         file_size,
         created_at
       FROM learning_materials
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Material uploaded successfully.",
      material: rows[0],
    });
  } catch (error) {
    if (savedFilename) {
      await removeStoredFile(savedFilename).catch(() => {});
    }

    next(error);
  }
}

// GET /api/student/materials/:id/download
async function downloadStudentMaterial(req, res, next) {
  try {
    const db = req.app.locals.db;
    const studentId = validId(req.session.user.id);
    const materialId = validId(req.params.id);

    if (!studentId || !materialId) {
      return res.status(400).json({
        success: false,
        message: "Invalid student or material ID.",
      });
    }

    const [rows] = await db.execute(
      `SELECT
         lm.id,
         lm.original_filename,
         lm.stored_filename,
         lm.mime_type,
         lm.file_size
       FROM learning_materials lm
       INNER JOIN modules m ON m.id = lm.module_id
       INNER JOIN courses c ON c.id = m.course_id
       INNER JOIN course_enrollments ce
         ON ce.course_id = c.id
       WHERE lm.id = ?
         AND ce.student_id = ?
         AND ce.enrollment_status = 'active'
         AND lm.stored_filename IS NOT NULL
       LIMIT 1`,
      [materialId, studentId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Material not found or you are not actively enrolled.",
      });
    }

    const material = rows[0];
    const filePath = safeStoredPath(material.stored_filename);

    if (!filePath) {
      return res.status(500).json({
        success: false,
        message: "Stored file reference is invalid.",
      });
    }

    await fs.access(filePath);

    const downloadName = path
      .basename(material.original_filename || "course-material")
      .replace(/[\r\n"]/g, "_");

    res.setHeader(
      "Content-Type",
      material.mime_type || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "The stored file could not be found.",
      });
    }

    next(error);
  }
}

// DELETE /api/instructor/materials/:id
async function deleteModuleMaterial(req, res, next) {
  try {
    const db = req.app.locals.db;
    const instructorId = validId(req.session.user.id);
    const materialId = validId(req.params.id);

    if (!instructorId || !materialId) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor or material ID.",
      });
    }

    const [rows] = await db.execute(
      `SELECT lm.id, lm.stored_filename
       FROM learning_materials lm
       INNER JOIN modules m ON m.id = lm.module_id
       INNER JOIN courses c ON c.id = m.course_id
       WHERE lm.id = ?
         AND c.instructor_id = ?
       LIMIT 1`,
      [materialId, instructorId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Material not found or not assigned to your course.",
      });
    }

    const storedFilename = rows[0].stored_filename;

    await db.execute(
      `DELETE FROM learning_materials WHERE id = ?`,
      [materialId]
    );

    if (storedFilename) {
      await removeStoredFile(storedFilename).catch((error) => {
        console.error("Unable to remove stored material:", error.message);
      });
    }

    return res.json({
      success: true,
      message: "Material deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getModuleMaterials,
  uploadModuleMaterial,
  downloadStudentMaterial,
  deleteModuleMaterial,
};