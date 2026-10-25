import React, { useCallback, useEffect, useState } from 'react';
import TodayDate from '../common/TodayDate';
import StatCards from '../common/StatCards';
import ActivityList from '../common/ActivityList';
import apiRequest from '../../services/api';

function InstructorDashboard({
  setActiveMenu,
  instructorStats,
  instructorActivities,
  schoolBuilding,
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const quickActions = [
    { label: 'Create Assignment', icon: '✎', target: 'Assignments' },
    { label: 'View Submissions', icon: '☑', target: 'Submissions' },
    { label: 'Enter Grades', icon: '▥', target: 'Grades' },
  ];

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest('/instructor/courses');

      setCourses(
        Array.isArray(response?.courses) ? response.courses : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load your assigned courses.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <h1>Instructor Dashboard</h1>
          <p>Welcome back! Manage your assigned courses and students.</p>
        </div>

        <TodayDate />
      </section>

      <StatCards stats={instructorStats} />

      <section className="dashboard-main-grid">
        <article className="dashboard-card activity-chart-card">
          <div className="card-heading">
            <div>
              <h2>My Assigned Courses</h2>
              <p>Courses assigned to your instructor account</p>
            </div>

            <button
              type="button"
              className="primary-action-button"
              onClick={loadCourses}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="activity-list">
            {loading ? (
              <p className="course-dashboard-message">
                Loading your assigned courses...
              </p>
            ) : error ? (
              <div className="course-dashboard-message course-dashboard-error">
                <p>{error}</p>

                <button
                  type="button"
                  className="primary-action-button"
                  onClick={loadCourses}
                >
                  Try Again
                </button>
              </div>
            ) : courses.length === 0 ? (
              <div className="course-dashboard-message">
                <h3>No Assigned Courses Yet</h3>
                <p>
                  Wala ka pang assigned course. Ask your administrator
                  to assign a course to your instructor account.
                </p>
              </div>
            ) : (
              courses.map((course) => (
                <div className="activity-item" key={course.id}>
                  <div className="activity-icon blue">▣</div>

                  <div className="activity-description">
                    <strong>
                      {course.course_code} — {course.course_name}
                    </strong>

                    <span>
                      {Number(course.enrolled_students || 0)} enrolled student
                      {Number(course.enrolled_students || 0) === 1 ? '' : 's'}
                    </span>

                    {course.description && (
                      <span>{course.description}</span>
                    )}
                  </div>

                  <small>Assigned</small>
                </div>
              ))
            )}
          </div>
        </article>

        <ActivityList
          activities={instructorActivities}
          onViewAll={() => setActiveMenu('Submissions')}
        />

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
              "Teaching is the greatest act of optimism."
            </blockquote>

            <p>— Colegio De San Francisco Javier</p>
          </article>
        </div>
      </section>
    </>
  );
}

export default InstructorDashboard;