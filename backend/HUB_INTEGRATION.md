# IT Department Hub Integration

The integration API is server-to-server. Keep `HUB_API_KEY` only in the LMS backend environment and the Hub server environment; never place it in browser code.

## Setup

1. Generate a long random key, for example with `openssl rand -hex 32`, and set the same value as `HUB_API_KEY` in both server environments.
2. Run `npm run migrate:hub-integration` from `backend/` against the LMS database.
3. Deploy/restart the backend, then call it using `Authorization: Bearer <HUB_API_KEY>`.

All routes below are under `/api/integration`. Existing `GET /api/db-check` remains public. `GET /api/students/:studentNumber/courses` requires the Bearer key because it returns student progress and grades.

## Endpoints

- `GET /students/:studentNumber/courses/:courseId/content` returns modules, learning materials, assignments, and quizzes for an actively enrolled student. Quiz choices are returned without correct-answer flags. File materials include a `download_url`.
- `GET /materials/:materialId/download` downloads an uploaded learning material.
- `POST /courses/:courseId/assignments` creates an assignment. JSON fields: `instructor_id`, `title`, optional `description`, `module_id`, `due_date`, and `points`.
- `POST /courses/:courseId/quizzes` creates a quiz and its questions. JSON fields: `instructor_id`, `title`, optional `description`, `module_id`, `total_points`, ISO-8601 `due_date`, and `questions`. Each question has `question_text`, optional `points`, and `choices`; each choice has `text` and boolean `is_correct`. Exactly one choice per question must be correct.
- `POST /assignments/:assignmentId/submissions` records a student's text response. JSON fields: `student_number` and `submission_text`. Only actively enrolled students can submit, and submissions after the assignment deadline are rejected.
- `POST /quizzes/:quizId/submissions` records one multiple-choice attempt per student. JSON fields: `student_number` and `answers`, an array of `{ "question_id": 1, "choice_id": 2 }`. All questions must be answered before the quiz deadline. The LMS grades the attempt automatically.

Use the deployed backend's HTTPS base URL as the API base. Do not send the API key from an end-user browser; the Hub backend should make these calls on its behalf.

## Upload LMS Grades to the Hub

After an instructor grades an assignment or the Hub-submitted quiz is automatically graded, the LMS sends the student's current graded course results to the Hub:

- `GET https://it-department-hub.onrender.com/api/students/:student_id/grades` retrieves the current Hub grade array.
- `PUT https://it-department-hub.onrender.com/api/students/:student_id/grades` uploads the merged array.
- Headers: `x-api-key: <Student Records API key>` and `Content-Type: application/json`.

Set `HUB_STUDENT_RECORDS_API_KEY` in the LMS backend/Render service to the Student Records API key. This is separate from `HUB_API_KEY`, which authenticates Hub requests coming into the LMS. The optional `HUB_STUDENT_RECORDS_API_URL` setting can override the default base `https://it-department-hub.onrender.com/api/students`.

Each LMS course is sent as `{ subject_code, subject_name, grade, remarks }`, using the course code/name and the points-weighted percentage across graded assignments and quizzes. School year and semester are omitted because LMS courses do not currently store those term fields. Before uploading, the LMS merges its grades into the array retrieved from the Hub by `subject_code`, preserving grade rows for subjects managed elsewhere. If Hub sync fails, the LMS grade remains saved locally and the response reports `hub_grade_sync: "pending"`; the backend logs the failure for retry/diagnosis.