import React, { useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import TodayDate from '../common/TodayDate';
import StatCards from '../common/StatCards';

export default function StudentDashboard({
  setActiveMenu,
  studentStats,
  schoolBuilding,
}) {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentError, setAssignmentError] = useState('');

  // Fetch enrolled courses
  useEffect(() => {
    let isMounted = true;

    async function fetchMyCourses() {
      try {
        setLoadingCourses(true);
        setCourseError('');

        const response = await apiRequest('/student/courses', {
          method: 'GET',
        });

        if (isMounted) {
          setCourses(
            Array.isArray(response.courses) ? response.courses : []
          );
        }
      } catch (error) {
        if (isMounted) {
          setCourseError(
            error.message || 'Unable to load your enrolled courses.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingCourses(false);
        }
      }
    }

    fetchMyCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch assignments from the backend
  useEffect(() => {
    let isMounted = true;

    async function fetchMyAssignments() {
      try {
        setLoadingAssignments(true);
        setAssignmentError('');

        const response = await apiRequest('/student/assignments', {
          method: 'GET',
        });

        if (isMounted) {
          setAssignments(
            Array.isArray(response.assignments)
              ? response.assignments
              : []
          );
        }
      } catch (error) {
        if (isMounted) {
          setAssignmentError(
            error.message || 'Unable to load your assignments.'
          );
        }
      } finally {
        if (isMounted) {
          setLoadingAssignments(false);
        }
      }
    }

    fetchMyAssignments();

    return () => {
      isMounted = false;
    };
  }, []);

  const quickActions = [
    { label: 'My Courses', icon: '▣', target: 'My Courses' },
    { label: 'Assignments', icon: '✎', target: 'Assignments' },
    { label: 'View Grades', icon: '▥', target: 'My Grades' },
  ];

  // Format assignment deadline
  function formatDeadline(dateValue) {
    if (!dateValue) {
      return 'No deadline set';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Deadline unavailable';
    }

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Determine assignment icon color
  function getAssignmentColor(status) {
    if (status === 'Submitted') return 'green';
    if (status === 'Overdue') return 'gold';
    return 'blue';
  }

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <h1>Student Dashboard</h1>
          <p>Welcome back! Track your academic progress.</p>
        </div>

        <TodayDate />
      </section>

      <StatCards stats={studentStats} />

      <section className="dashboard-main-grid">
        {/* Enrolled Courses */}
        <article className="dashboard-card activity-chart-card">
          <div className="card-heading">
            <div>
              <h2>My Enrolled Courses</h2>
              <p>Your currently active courses</p>
            </div>

            <button
              type="button"
              className="text-link"
              onClick={() => setActiveMenu('My Courses')}
            >
              View All
            </button>
          </div>

          <div className="activity-list">
            {loadingCourses ? (
              <div className="activity-item">
                <div className="activity-description">
                  <strong>Loading your courses...</strong>
                  <span>
                    Please wait while we retrieve your records.
                  </span>
                </div>
              </div>
            ) : courseError ? (
              <div className="activity-item">
                <div className="activity-description">
                  <strong>Unable to load courses</strong>
                  <span>{courseError}</span>
                </div>
              </div>
            ) : courses.length === 0 ? (
              <div className="activity-item">
                <div className="activity-description">
                  <strong>No active courses yet</strong>
                  <span>
                    Your enrolled courses will appear here once you have
                    an active enrollment.
                  </span>
                </div>
              </div>
            ) : (
              courses.map((course) => (
                <div
                  className="activity-item"
                  key={course.enrollment_id}
                >
                  <div className="activity-icon blue">▣</div>

                  <div className="activity-description">
                    <strong>
                      {course.course_code} — {course.course_name}
                    </strong>

                    <span>
                      Instructor:{' '}
                      {course.instructor_name || 'Not assigned'}
                    </span>
                  </div>

                  <small>
                    {course.enrollment_status === 'active'
                      ? 'Active'
                      : course.enrollment_status}
                  </small>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Upcoming Assignments */}
        <div
          className="dashboard-right-column"
          style={{ maxWidth: '100%' }}
        >
          <article className="dashboard-card recent-activities-card">
            <div className="card-heading">
              <div>
                <h2>Upcoming Assignments</h2>
                <p>Deadlines and submission status</p>
              </div>

              <button
                type="button"
                className="text-link"
                onClick={() => setActiveMenu('Assignments')}
              >
                View All
              </button>
            </div>

            <div className="activity-list">
              {loadingAssignments ? (
                <div className="activity-item">
                  <div className="activity-description">
                    <strong>Loading assignments...</strong>
                    <span>
                      Retrieving assignments from your enrolled courses.
                    </span>
                  </div>
                </div>
              ) : assignmentError ? (
                <div className="activity-item">
                  <div className="activity-description">
                    <strong>Unable to load assignments</strong>
                    <span>{assignmentError}</span>
                  </div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="activity-item">
                  <div className="activity-description">
                    <strong>No assignments available</strong>
                    <span>
                      Assignments from your enrolled courses will appear
                      here when your instructors publish them.
                    </span>
                  </div>
                </div>
              ) : (
                assignments.map((item) => (
                  <div
                    className="activity-item"
                    key={item.assignment_id}
                  >
                    <div
                      className={`activity-icon ${getAssignmentColor(
                        item.submission_status
                      )}`}
                    >
                      {item.submission_status === 'Submitted'
                        ? '✓'
                        : item.submission_status === 'Overdue'
                          ? '!'
                          : '▤'}
                    </div>

                    <div className="activity-description">
                      <strong>{item.title}</strong>

                      <span>
                        {item.course_code
                          ? `${item.course_code} — `
                          : ''}
                        {item.course_name || 'Course unavailable'}
                      </span>

                      <span>
                        Deadline: {formatDeadline(item.due_date)}
                      </span>
                    </div>

                    <small>{item.submission_status}</small>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>

        {/* Quick Actions and School Quote */}
        <div className="dashboard-right-column">
          <article className="dashboard-card quick-actions-card">
            <div className="card-heading">
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="quick-action-button"
                  onClick={() => setActiveMenu(action.target)}
                >
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                </button>
              ))}
            </div>
          </article>

          <article
            className="school-quote-card"
            style={{
              '--quote-background': `url("${schoolBuilding}")`,
            }}
          >
            <div className="quote-overlay" />

            <blockquote>
              "The beautiful thing about learning is that no one can take
              it away from you."
            </blockquote>

            <p>— Colegio De San Francisco Javier</p>
          </article>
        </div>
      </section>
    </>
  );
}