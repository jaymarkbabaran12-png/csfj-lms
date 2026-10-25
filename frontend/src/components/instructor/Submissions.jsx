import React, { useCallback, useEffect, useState } from "react";
import "./Submissions.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function Submissions() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [submissions, setSubmissions] = useState([]);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setError("");

    try {
      const data = await apiRequest("/instructor/courses");
      const courseList = Array.isArray(data)
        ? data
        : data.courses || data.data || [];

      setCourses(courseList);

      if (courseList.length > 0) {
        setSelectedCourse((current) => {
          const exists = courseList.some(
            (course) => String(course.id) === String(current)
          );

          return exists ? current : String(courseList[0].id);
        });
      } else {
        setSelectedCourse("");
        setSubmissions([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load courses.");
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!selectedCourse) {
      setSubmissions([]);
      return;
    }

    setLoadingSubmissions(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest(
        `/instructor/courses/${selectedCourse}/submissions`
      );

      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message || "Failed to load submissions.");
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  function openGrading(submission) {
    setSelectedSubmission(submission);
    setScore(
      submission.score === null || submission.score === undefined
        ? ""
        : String(submission.score)
    );
    setFeedback(submission.feedback || "");
    setError("");
    setSuccess("");
  }

  function closeGrading() {
    setSelectedSubmission(null);
    setScore("");
    setFeedback("");
  }

  async function saveGrade(event) {
    event.preventDefault();

    if (!selectedSubmission) return;

    const maxPoints = Number(selectedSubmission.max_points);
    const numericScore = Number(score);

    if (score.trim() === "" || !Number.isFinite(numericScore)) {
      setError("Please enter a valid score.");
      return;
    }

    if (numericScore < 0 || numericScore > maxPoints) {
      setError(`Score must be between 0 and ${maxPoints}.`);
      return;
    }

    setSavingGrade(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(
        `/instructor/submissions/${selectedSubmission.submission_id}/grade`,
        {
          method: "PUT",
          body: JSON.stringify({
            score: numericScore,
            feedback,
          }),
        }
      );

      setSuccess("Grade and feedback saved successfully.");
      closeGrading();
      await loadSubmissions();
    } catch (err) {
      setError(err.message || "Failed to save grade.");
    } finally {
      setSavingGrade(false);
    }
  }

  const filteredSubmissions = submissions.filter((submission) => {
    const searchText = search.toLowerCase();

    const matchesSearch = [
      submission.student_name,
      submission.student_username,
      submission.assignment_title,
      submission.student_email,
    ].some((value) => String(value || "").toLowerCase().includes(searchText));

    const isGraded =
      submission.score !== null && submission.score !== undefined;

    const matchesFilter =
      filter === "all" ||
      (filter === "graded" && isGraded) ||
      (filter === "pending" && !isGraded);

    return matchesSearch && matchesFilter;
  });

  const gradedCount = submissions.filter(
    (submission) =>
      submission.score !== null && submission.score !== undefined
  ).length;

  const pendingCount = submissions.length - gradedCount;

  return (
    <section className="submissions-page">
      <header className="submissions-header">
        <div>
          <p className="submissions-eyebrow">INSTRUCTOR WORKSPACE</p>
          <h1>Submissions</h1>
          <p className="submissions-description">
            Review student work, provide feedback, and manage assignment grades.
          </p>
        </div>

        <button
          type="button"
          className="submissions-refresh"
          onClick={() => {
            loadCourses();
            loadSubmissions();
          }}
          disabled={loadingCourses || loadingSubmissions}
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <div className="submission-alert submission-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Close">
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          className="submission-alert submission-alert-success"
          role="status"
        >
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      <div className="submissions-course-panel">
        <label htmlFor="submission-course">Select course</label>

        <select
          id="submission-course"
          value={selectedCourse}
          onChange={(event) => {
            setSelectedCourse(event.target.value);
            closeGrading();
          }}
          disabled={loadingCourses || courses.length === 0}
        >
          {loadingCourses ? (
            <option value="">Loading courses...</option>
          ) : courses.length === 0 ? (
            <option value="">No assigned courses</option>
          ) : (
            courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} — {course.course_name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="submissions-stats">
        <article className="submission-stat-card">
          <span className="submission-stat-icon">▤</span>
          <div>
            <p>Total submissions</p>
            <strong>{submissions.length}</strong>
          </div>
        </article>

        <article className="submission-stat-card">
          <span className="submission-stat-icon">✓</span>
          <div>
            <p>Graded</p>
            <strong>{gradedCount}</strong>
          </div>
        </article>

        <article className="submission-stat-card">
          <span className="submission-stat-icon">◷</span>
          <div>
            <p>Pending review</p>
            <strong>{pendingCount}</strong>
          </div>
        </article>
      </div>

      <div className="submissions-list-panel">
        <div className="submissions-list-header">
          <div>
            <h2>Student submissions</h2>
            <p>Review submitted work and record grades.</p>
          </div>

          <span className="submission-total-badge">
            {filteredSubmissions.length} records
          </span>
        </div>

        <div className="submissions-toolbar">
          <input
            type="search"
            placeholder="Search student or assignment..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search submissions"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter submissions"
          >
            <option value="all">All submissions</option>
            <option value="pending">Pending review</option>
            <option value="graded">Graded</option>
          </select>
        </div>

        {loadingSubmissions ? (
          <div className="submissions-empty">
            <span className="submissions-spinner" />
            <p>Loading student submissions...</p>
          </div>
        ) : !selectedCourse ? (
          <div className="submissions-empty">
            <span className="submissions-empty-icon">▤</span>
            <h3>No course selected</h3>
            <p>Select an assigned course to view its submissions.</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="submissions-empty">
            <span className="submissions-empty-icon">▤</span>
            <h3>No submissions found</h3>
            <p>
              There are no matching submissions for this course and filter.
            </p>
          </div>
        ) : (
          <div className="submissions-table-wrap">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Submitted</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSubmissions.map((submission) => {
                  const isGraded =
                    submission.score !== null &&
                    submission.score !== undefined;

                  return (
                    <tr key={submission.submission_id}>
                      <td>
                        <div className="submission-student">
                          <span className="submission-avatar">
                            {(submission.student_name ||
                              submission.student_username ||
                              "S")
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {submission.student_name ||
                                submission.student_username ||
                                `Student #${submission.student_id}`}
                            </strong>
                            <small>
                              {submission.student_email ||
                                submission.student_username ||
                                "Student"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>{submission.assignment_title}</strong>
                        <small>
                          Due: {formatDate(submission.due_date)}
                        </small>
                      </td>

                      <td>{formatDate(submission.submitted_at)}</td>

                      <td>
                        {isGraded ? (
                          <strong>
                            {submission.score} / {submission.max_points}
                          </strong>
                        ) : (
                          <span className="submission-ungraded">—</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`submission-status ${
                            isGraded
                              ? "submission-status-graded"
                              : "submission-status-pending"
                          }`}
                        >
                          {isGraded ? "Graded" : "Pending"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="submission-review-button"
                          onClick={() => openGrading(submission)}
                        >
                          {isGraded ? "Review" : "Grade"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <div
          className="submission-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingGrade) {
              closeGrading();
            }
          }}
        >
          <section
            className="submission-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grading-modal-title"
          >
            <header className="submission-modal-header">
              <div>
                <p className="submissions-eyebrow">SUBMISSION REVIEW</p>
                <h2 id="grading-modal-title">Grade student work</h2>
              </div>

              <button
                type="button"
                className="submission-modal-close"
                onClick={closeGrading}
                disabled={savingGrade}
                aria-label="Close grading dialog"
              >
                ×
              </button>
            </header>

            <div className="submission-modal-body">
              <div className="submission-detail-card">
                <span>Student</span>
                <strong>
                  {selectedSubmission.student_name ||
                    selectedSubmission.student_username ||
                    `Student #${selectedSubmission.student_id}`}
                </strong>

                <span>Assignment</span>
                <strong>{selectedSubmission.assignment_title}</strong>

                <span>Submitted</span>
                <strong>{formatDate(selectedSubmission.submitted_at)}</strong>
              </div>

              <div className="submission-answer-section">
                <h3>Student's written answer</h3>

                {selectedSubmission.submission_text ? (
                  <div className="submission-answer">
                    {selectedSubmission.submission_text}
                  </div>
                ) : (
                  <p className="submission-no-answer">
                    No written answer was provided.
                  </p>
                )}
              </div>

              {selectedSubmission.submission_file && (
                <div className="submission-file-section">
                  <h3>Submitted file information</h3>
                  <p>
                    {selectedSubmission.submission_file}
                  </p>
                  <small>
                    Verify the file path or download endpoint before making it
                    a clickable link.
                  </small>
                </div>
              )}

              <form onSubmit={saveGrade} className="submission-grade-form">
                <label htmlFor="submission-score">
                  Score
                  <span>
                    Maximum: {selectedSubmission.max_points} points
                  </span>
                </label>

                <input
                  id="submission-score"
                  type="number"
                  min="0"
                  max={Number(selectedSubmission.max_points)}
                  step="any"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  required
                  disabled={savingGrade}
                />

                <label htmlFor="submission-feedback">Feedback</label>

                <textarea
                  id="submission-feedback"
                  rows="5"
                  maxLength="5000"
                  placeholder="Write feedback for the student..."
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  disabled={savingGrade}
                />

                <div className="submission-modal-actions">
                  <button
                    type="button"
                    className="submission-cancel-button"
                    onClick={closeGrading}
                    disabled={savingGrade}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="submission-save-button"
                    disabled={savingGrade}
                  >
                    {savingGrade ? "Saving..." : "Save Grade"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Submissions;
