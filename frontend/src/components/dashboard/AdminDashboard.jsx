import React, { useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import TodayDate from '../common/TodayDate';
import StatCards from '../common/StatCards';
import ActivityList from '../common/ActivityList';

function AdminDashboard({
  setActiveMenu,
  initialActivities,
  schoolBuilding,
}) {
  const [stats, setStats] = useState([
    { title: 'Total Users', value: '—', change: 'Live', icon: '♟', color: 'blue' },
    { title: 'Total Admins', value: '—', change: 'Live', icon: '♟', color: 'green' },
    { title: 'Total Instructors', value: '—', change: 'Live', icon: '♟', color: 'purple' },
    { title: 'Total Students', value: '—', change: 'Live', icon: '♟', color: 'gold' },
    { title: 'Total Courses', value: '—', change: 'Live', icon: '▣', color: 'red' },
  ]);

  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const data = await apiRequest('/admin/dashboard/stats');

        if (cancelled) return;

        if (!data?.success || !data?.stats) {
          throw new Error('Unable to load dashboard statistics.');
        }

        const values = data.stats;

        setStats([
          { title: 'Total Users', value: String(values.totalUsers ?? 0), change: 'Live', icon: '♟', color: 'blue' },
          { title: 'Total Admins', value: String(values.totalAdmins ?? 0), change: 'Live', icon: '♟', color: 'green' },
          { title: 'Total Instructors', value: String(values.totalInstructors ?? 0), change: 'Live', icon: '♟', color: 'purple' },
          { title: 'Total Students', value: String(values.totalStudents ?? 0), change: 'Live', icon: '♟', color: 'gold' },
          { title: 'Total Courses', value: String(values.totalCourses ?? 0), change: 'Live', icon: '▣', color: 'red' },
        ]);
        setStatsError('');
      } catch (error) {
        if (!cancelled) {
          setStatsError(error.message || 'Failed to load dashboard statistics.');
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const quickActions = [
    { label: 'Add User', icon: '♟', target: 'User Management' },
    { label: 'Create Course', icon: '▣', target: 'Course Management' },
    { label: 'Manage Enrollments', icon: '♧', target: 'Enrollment Management' },
    { label: 'View Reports', icon: '▥', target: 'Reports & Analytics' },
  ];

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back! Here is your system overview.</p>
        </div>
        <TodayDate />
      </section>

      <StatCards stats={stats} />

{statsError && (
  <p role="alert" style={{ color: '#b42318', marginTop: '8px' }}>
    Dashboard statistics: {statsError}
  </p>
)}

      <section className="dashboard-main-grid">
        <article className="dashboard-card activity-chart-card">
          <div className="card-heading">
            <div>
              <h2>System Activity Overview</h2>
              <p>Course enrollments and submissions (last 7 days)</p>
            </div>

            <div className="chart-legend">
              <span><i className="legend-blue" /> Enrollments</span>
              <span><i className="legend-gold" /> Submissions</span>
            </div>
          </div>

          <div className="activity-chart">
            <svg
              viewBox="0 0 620 260"
              role="img"
              aria-label="Sample chart of weekly enrollments and submissions"
              preserveAspectRatio="none"
            >
              {[30, 75, 120, 165, 210].map((y, index) => (
                <g key={y}>
                  <line
                    x1="48"
                    y1={y}
                    x2="605"
                    y2={y}
                    stroke="#e2eaf5"
                    strokeWidth="1"
                  />
                  <text
                    x="5"
                    y={y + 4}
                    fill="#61799e"
                    fontSize="11"
                  >
                    {100 - index * 20}
                  </text>
                </g>
              ))}

              {[60, 145, 230, 315, 400, 485, 570].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1="30"
                  x2={x}
                  y2="210"
                  stroke="#edf1f8"
                />
              ))}

              <path
                d="M60 150 L145 125 L230 90 L315 112 L400 72 L485 88 L570 58 L570 210 L60 210 Z"
                fill="#1674f5"
                fillOpacity="0.09"
              />

              <polyline
                points="60,150 145,125 230,90 315,112 400,72 485,88 570,58"
                fill="none"
                stroke="#1674f5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <polyline
                points="60,165 145,150 230,130 315,150 400,126 485,145 570,120"
                fill="none"
                stroke="#f2b52e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {[
                [60, 150],
                [145, 125],
                [230, 90],
                [315, 112],
                [400, 72],
                [485, 88],
                [570, 58],
              ].map(([x, y]) => (
                <circle
                  key={`a-${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#1674f5"
                />
              ))}

              {[
                [60, 165],
                [145, 150],
                [230, 130],
                [315, 150],
                [400, 126],
                [485, 145],
                [570, 120],
              ].map(([x, y]) => (
                <circle
                  key={`b-${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#f2b52e"
                />
              ))}

              {[
                'Oct 3',
                'Oct 4',
                'Oct 5',
                'Oct 6',
                'Oct 7',
                'Oct 8',
                'Oct 9',
              ].map((day, index) => (
                <text
                  key={day}
                  x={[60, 145, 230, 315, 400, 485, 570][index]}
                  y="235"
                  fill="#61799e"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {day}
                </text>
              ))}
            </svg>
          </div>
        </article>

        <ActivityList
          activities={initialActivities}
          onViewAll={() => setActiveMenu('Reports & Analytics')}
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
              "Education is the most powerful weapon which you can use to change
              the world."
            </blockquote>

            <p>— Colegio De San Francisco Javier</p>
          </article>
        </div>
      </section>
    </>
  );
}

export default AdminDashboard;
