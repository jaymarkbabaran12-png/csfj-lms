import React, { useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './MyCourses.css';

export default function MyCourses({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        setLoading(true);
        setError('');

        const response = await apiRequest('/student/courses');

        if (!cancelled) {
          setCourses(
            Array.isArray(response.courses)
              ? response.courses
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || 'Unable to load your enrolled courses.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  function openCourse(course) {
    if (!onSelectCourse) {
      return;
    }

    const courseId = Number(course.course_id);

    if (!Number.isSafeInteger(courseId) || courseId < 1) {
      setError('Invalid course ID. Please refresh and try again.');
      return;
    }

    onSelectCourse(courseId);
  }

  function handleCourseKeyDown(event, course) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCourse(course);
    }
  }

  return (
    <section className="my-courses-page">
      <header className="my-courses-header">
        <div>
          <span className="my-courses-eyebrow">
            LEARNING MANAGEMENT SYSTEM
          </span>

          <h1>My Courses</h1>

          <p>
            View and manage your currently enrolled courses.
          </p>
        </div>

        <div className="my-courses-total">
          <span className="my-courses-total-icon">▣</span>

          <div>
            <strong>{loading ? '—' : courses.length}</strong>
            <span>Active Courses</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="my-courses-message">
          <div className="my-courses-spinner" />

          <h2>Loading your courses</h2>

          <p>
            Please wait while we retrieve your enrollment records.
          </p>
        </div>
      ) : error && courses.length === 0 ? (
        <div className="my-courses-message my-courses-error">
          <div className="my-courses-message-icon">!</div>

          <h2>Unable to load courses</h2>

          <p>{error}</p>

          <button
            type="button"
            className="my-courses-button"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="my-courses-message">
          <div className="my-courses-message-icon">▣</div>

          <h2>No enrolled courses yet</h2>

          <p>
            Your active course enrollments will appear here once
            they have been registered by your school.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div
              className="my-courses-message my-courses-error"
              role="alert"
            >
              <p>{error}</p>
            </div>
          )}

          <div className="my-courses-section-heading">
            <div>
              <h2>Your Enrolled Courses</h2>

              <p>
                You currently have {courses.length}{' '}
                {courses.length === 1 ? 'course' : 'courses'} enrolled.
              </p>
            </div>
          </div>

          <div className="my-courses-grid">
            {courses.map((course) => (
              <article
                className="my-course-card"
                key={course.enrollment_id}
                onClick={() => openCourse(course)}
                role={onSelectCourse ? 'button' : undefined}
                tabIndex={onSelectCourse ? 0 : undefined}
                onKeyDown={(event) =>
                  handleCourseKeyDown(event, course)
                }
                aria-label={
                  onSelectCourse
                    ? `Open ${course.course_name} course details`
                    : undefined
                }
              >
                <div className="my-course-card-top">
                  <div className="my-course-icon">▣</div>

                  <span className="my-course-status">
                    <span className="my-course-status-dot" />
                    Active
                  </span>
                </div>

                <div className="my-course-code">
                  {course.course_code || 'NO COURSE CODE'}
                </div>

                <h3>{course.course_name || 'Untitled Course'}</h3>

                <div className="my-course-divider" />

                <div className="my-course-information">
                  <span className="my-course-info-icon">♙</span>

                  <div>
                    <span>Instructor</span>

                    <strong>
                      {course.instructor_name || 'Not assigned'}
                    </strong>
                  </div>
                </div>

                {course.description && (
                  <p className="my-course-description">
                    {course.description}
                  </p>
                )}

                <div className="my-course-card-footer">
                  <span>Course Enrollment</span>

                  <span className="my-course-enrollment-label">
                    {course.enrollment_status || 'active'}
                  </span>
                </div>

                {onSelectCourse && (
                  <div className="my-course-open-hint">
                    View Course Details →
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}