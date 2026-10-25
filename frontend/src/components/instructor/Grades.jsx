import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./Grades.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function apiRequest(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to load grades.");
  }

  return data;
}

function Grades() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    setError("");

    try {
      const data = await apiRequest("/instructor/courses");
      const list = Array.isArray(data)
        ? data
        : data.courses || data.data || [];

      setCourses(list);
      setSelectedCourse((current) => {
        if (list.some((course) => String(course.id) === String(current))) {
          return current;
        }

        return list.length ? String(list[0].id) : "";
      });
    } catch (err) {
      setError(err.message || "Unable to load instructor courses.");
      setCourses([]);
      setSelectedCourse("");
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadGrades = useCallback(async () => {
    if (!selectedCourse) {
      setSubmissions([]);
      return;
    }

    setLoadingGrades(true);
    setError("");

    try {
      const data = await apiRequest(
        `/instructor/courses/${selectedCourse}/submissions`
      );

      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch (err) {
      setSubmissions([]);
      setError(err.message || "Unable to load grades.");
    } finally {
      setLoadingGrades(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const isGraded = (submission) =>
    submission.score !== null && submission.score !== undefined;

  const gradedCount = submissions.filter(isGraded).length;
  const pendingCount = submissions.length - gradedCount;

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesSearch = [
        submission.student_name,
        submission.student_username,
        submission.assignment_title,
        submission.student_email,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesFilter =
        filter === "all" ||
        (filter === "graded" && isGraded(submission)) ||
        (filter === "pending" && !isGraded(submission));

      return matchesSearch && matchesFilter;
    });
  }, [submissions, search, filter]);

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString();
  }

  return (
    <section className="instructor-grades">
      <header className="grades-header">
        <div>
          <span className="grades-eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Grades</h1>
          <p>Review student scores and assignment grading progress.</p>
        </div>

        <button
          type="button"
          className="grades-refresh"
          onClick={() => {
            loadCourses();
            loadGrades();
          }}
          disabled={loadingCourses || loadingGrades}
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <div className="grades-alert" role="alert">
          {error}
        </div>
      )}

      <div className="grades-toolbar">
        <div className="grades-course-select">
          <label htmlFor="grades-course">Course</label>
          <select
            id="grades-course"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            disabled={loadingCourses || courses.length === 0}
          >
            {courses.length === 0 && <option value="">No courses available</option>}
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} — {course.course_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grades-search">
          <label htmlFor="grades-search">Search</label>
          <input
            id="grades-search"
            type="search"
            placeholder="Student or assignment..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grades-filter">
          <label htmlFor="grades-filter">Status</label>
          <select
            id="grades-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All submissions</option>
            <option value="graded">Graded</option>
            <option value="pending">Pending grades</option>
          </select>
        </div>
      </div>

      <div className="grades-summary">
        <article>
          <span>Total Submissions</span>
          <strong>{submissions.length}</strong>
        </article>
        <article>
          <span>Graded</span>
          <strong>{gradedCount}</strong>
        </article>
        <article>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </article>
      </div>

      <div className="grades-table-wrap">
        {loadingCourses || loadingGrades ? (
          <div className="grades-empty">Loading grades...</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="grades-empty">
            {submissions.length === 0
              ? "No student submissions found for this course."
              : "No submissions match your search or selected filter."}
          </div>
        ) : (
          <table className="grades-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Assignment</th>
                <th>Submitted</th>
                <th>Score</th>
                <th>Feedback</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => {
                const graded = isGraded(submission);

                return (
                  <tr key={submission.submission_id}>
                    <td>
                      <strong>{submission.student_name || "Unnamed student"}</strong>
                      <small>{submission.student_username || submission.student_email || ""}</small>
                    </td>
                    <td>{submission.assignment_title || "Untitled assignment"}</td>
                    <td>{formatDate(submission.submitted_at)}</td>
                    <td>
                      {graded
                        ? `${submission.score} / ${submission.max_points ?? "—"}`
                        : "Not graded"}
                    </td>
                    <td className="grades-feedback">
                      {submission.feedback || "—"}
                    </td>
                    <td>
                      <span
                        className={`grades-status ${
                          graded ? "is-graded" : "is-pending"
                        }`}
                      >
                        {graded ? "Graded" : "Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="grades-note">
        To enter or update a score and feedback, open the Submissions menu.
      </p>
    </section>
  );
}

export default Grades;
