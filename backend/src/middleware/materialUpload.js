const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.resolve(
  __dirname,
  "../../uploads/learning-materials"
);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

fs.mkdirSync(UPLOAD_DIR, {
  recursive: true,
  mode: 0o750,
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const storedFilename = `${crypto.randomUUID()}${extension}`;

    callback(null, storedFilename);
  },
});

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = ALLOWED_TYPES[extension];

  if (
    !allowedMimeTypes ||
    !allowedMimeTypes.includes(file.mimetype)
  ) {
    const error = new Error(
      "Invalid file type. Only PDF, DOC, DOCX, PPT, and PPTX files are allowed."
    );

    error.status = 400;

    return callback(error);
  }

  callback(null, true);
}

const uploadMaterial = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 10,
  },
});

module.exports = {
  uploadMaterial,
  MAX_FILE_SIZE,
};