import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiRequest from '../../services/api';
import './InstructorMyCourses.css';

export default function InstructorMyCourses({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/instructor/courses');

      setCourses(
        Array.isArray(response?.courses) ? response.courses : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load assigned courses.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return courses;

    return courses.filter((course) => {
      const searchableText = [
        course.course_code,
        course.course_name,
        course.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [courses, search]);

  return (
    <section className="instructor-courses-page">
      <header className="instructor-courses-header">
        <div>
          <span className="instructor-courses-eyebrow">
            INSTRUCTOR WORKSPACE
          </span>

          <h1>My Courses</h1>

          <p>
            Manage and review the courses assigned to your instructor account.
          </p>
        </div>

        <button
          type="button"
          className="instructor-courses-refresh"
          onClick={loadCourses}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </header>

      <div className="instructor-courses-summary-grid">
        <article className="instructor-courses-summary">
          <span className="instructor-courses-summary-icon">▣</span>

          <div>
            <strong>{loading ? '—' : courses.length}</strong>
            <span>Assigned Courses</span>
          </div>
        </article>

        <article className="instructor-courses-summary">
          <span className="instructor-courses-summary-icon gold">♙</span>

          <div>
            <strong>
              {loading
                ? '—'
                : courses.reduce(
                    (total, course) =>
                      total + Math.max(
                        0,
                        Number(course.enrolled_students) || 0
                      ),
                    0
                  )}
            </strong>

            <span>Total Enrolled Students</span>
          </div>
        </article>
      </div>

      <div className="instructor-courses-toolbar">
        <div className="instructor-courses-search">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search course name, code, or description..."
            aria-label="Search assigned courses"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="instructor-courses-clear-search"
            >
              ×
            </button>
          )}
        </div>

        {!loading && !error && (
          <span className="instructor-courses-result-count">
            Showing {filteredCourses.length} of {courses.length} courses
          </span>
        )}
      </div>

      {loading ? (
        <div className="instructor-courses-message">
          <div className="instructor-courses-spinner" />

          <h2>Loading your courses</h2>

          <p>
            Please wait while we retrieve your assigned courses.
          </p>
        </div>
      ) : error ? (
        <div className="instructor-courses-message instructor-courses-error">
          <div className="instructor-courses-empty-icon">!</div>

          <h2>Unable to load courses</h2>

          <p>{error}</p>

          <button
            type="button"
            className="instructor-courses-refresh"
            onClick={loadCourses}
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="instructor-courses-message">
          <div className="instructor-courses-empty-icon">▣</div>

          <h2>No assigned courses yet</h2>

          <p>
            Ask your administrator to assign a course to your instructor
            account. Once assigned, your courses will appear here.
          </p>

          <button
            type="button"
            className="instructor-courses-refresh"
            onClick={loadCourses}
          >
            ↻ Check Again
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="instructor-courses-message">
          <div className="instructor-courses-empty-icon">⌕</div>

          <h2>No matching courses</h2>

          <p>
            No assigned course matches "{search}". Try another course name
            or code.
          </p>

          <button
            type="button"
            className="instructor-courses-refresh"
            onClick={() => setSearch('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="instructor-courses-grid">
          {filteredCourses.map((course) => (
            <article
              className="instructor-course-card"
              key={course.id}
            >
              <div className="instructor-course-card-top">
                <span className="instructor-course-icon">▣</span>

                <span className="instructor-course-status">
                  Assigned
                </span>
              </div>

              <span className="instructor-course-code">
                {course.course_code || 'No course code'}
              </span>

              <h2>{course.course_name || 'Untitled course'}</h2>

              <p className="instructor-course-description">
                {course.description || 'No course description available.'}
              </p>

              <div className="instructor-course-card-footer">
                <div>
                  <strong>
                    {Math.max(0, Number(course.enrolled_students) || 0)}
                  </strong>
                  <span>Enrolled students</span>
                </div>
                <span className="instructor-course-enrollment-mark" aria-hidden="true">●</span>
              </div>

              <div className="instructor-course-actions">
                <button
                  type="button"
                  onClick={() => onSelectCourse?.(course.id, 'Modules')}
                  disabled={!onSelectCourse}
                >
                  Manage modules <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className="instructor-course-secondary-action"
                  onClick={() => onSelectCourse?.(course.id, 'Assignments')}
                  disabled={!onSelectCourse}
                >
                  Assignments
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="instructor-courses-footer">
        <span>CSFJ LMS</span>
        <span>Instructor Course Workspace</span>
      </footer>
    </section>
  );
}