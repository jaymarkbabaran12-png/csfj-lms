import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import './AdminAssignmentManagement.css';

const EMPTY_STATS = {
  totalAssignments: 0,
  upcomingAssignments: 0,
  overdueAssignments: 0,
  totalSubmissions: 0,
  gradedSubmissions: 0,
};

function formatDate(value) {
  if (!value) return 'No deadline';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAssignmentManagement() {
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set('search', search.trim());

      if (status === 'upcoming') params.set('status', 'upcoming');
      if (status === 'overdue') params.set('status', 'overdue');
      if (status === 'no_deadline') params.set('status', 'no_deadline');

      const query = params.toString();
      const endpoint = `/admin/assignments${query ? `?${query}` : ''}`;

      const [assignmentResponse, statsResponse] = await Promise.all([
        apiRequest(endpoint),
        apiRequest('/admin/assignments/stats'),
      ]);

      setAssignments(
        Array.isArray(assignmentResponse?.assignments)
          ? assignmentResponse.assignments
          : []
      );

      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {}),
      });
    } catch (err) {
      setError(
        err?.message ||
          'Hindi makuha ang assignments. Suriin ang backend at database connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAssignments();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadAssignments]);

  const statCards = [
    {
      label: 'Total Assignments',
      value: stats.totalAssignments,
      icon: '▤',
      color: 'blue',
    },
    {
      label: 'Upcoming',
      value: stats.upcomingAssignments,
      icon: '◷',
      color: 'gold',
    },
    {
      label: 'Overdue',
      value: stats.overdueAssignments,
      icon: '!',
      color: 'red',
    },
    {
      label: 'Submissions',
      value: stats.totalSubmissions,
      icon: '☑',
      color: 'green',
    },
  ];

  return (
    <section className="admin-assignment-page">
      <div className="assignment-page-heading">
        <div>
          <span className="assignment-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Assignment Management</h1>
          <p>
            Monitor instructor assignments, deadlines, and student submissions.
          </p>
        </div>

        <button
          type="button"
          className="assignment-refresh-button"
          onClick={loadAssignments}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="assignment-stats-grid">
        {statCards.map((card) => (
          <article className="assignment-stat-card" key={card.label}>
            <div className={`assignment-stat-icon ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p>{card.label}</p>
              <strong>{Number(card.value || 0).toLocaleString()}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="assignment-summary-note">
        <div>
          <strong>Graded submissions</strong>
          <span>
            {Number(stats.gradedSubmissions || 0).toLocaleString()} of{' '}
            {Number(stats.totalSubmissions || 0).toLocaleString()} submissions
          </span>
        </div>

        <div className="assignment-progress-track">
          <div
            className="assignment-progress-fill"
            style={{
              width: `${
                stats.totalSubmissions
                  ? Math.min(
                      100,
                      (stats.gradedSubmissions / stats.totalSubmissions) * 100
                    )
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <div className="assignment-table-panel">
        <div className="assignment-table-heading">
          <div>
            <h2>All Assignments</h2>
            <p>Assignment records from the CSFJ LMS database.</p>
          </div>
          <span className="assignment-record-count">
            {assignments.length} record{assignments.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="assignment-toolbar">
          <label className="assignment-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search title, course, instructor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search assignments"
            />
          </label>

          <select
            className="assignment-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter assignment status"
          >
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="no_deadline">No deadline</option>
          </select>
        </div>

        {error && (
          <div className="assignment-error" role="alert">
            <strong>Unable to load assignments.</strong>
            <p>{error}</p>
            <button type="button" onClick={loadAssignments}>
              Try again
            </button>
          </div>
        )}

        <div className="assignment-table-scroll">
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Instructor</th>
                <th>Deadline</th>
                <th>Points</th>
                <th>Submissions</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="assignment-empty-state">
                    Loading assignments...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="assignment-empty-state">
                    Data could not be loaded.
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="assignment-empty-state">
                    <span className="assignment-empty-icon">▤</span>
                    <strong>No assignments found</strong>
                    <p>
                      Try another search or filter, or check whether
                      assignments exist in the database.
                    </p>
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const statusLabel =
                    assignment.status ||
                    (assignment.due_date ? 'Upcoming' : 'No deadline');

                  const statusClass = statusLabel
                    .toLowerCase()
                    .replace(/\s+/g, '-');

                  return (
                    <tr key={assignment.id}>
                      <td>
                        <div className="assignment-title-cell">
                          <strong>{assignment.title}</strong>
                          <span>
                            {assignment.module_title || 'General assignment'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="assignment-course-cell">
                          <strong>
                            {assignment.course_code || 'N/A'}
                          </strong>
                          <span>{assignment.course_name || 'Unnamed course'}</span>
                        </div>
                      </td>

                      <td>
                        {assignment.instructor_name ||
                          assignment.instructor_username ||
                          'Unassigned'}
                      </td>

                      <td>{formatDate(assignment.due_date)}</td>

                      <td>{Number(assignment.points ?? 100)}</td>

                      <td>
                        <div className="assignment-submission-cell">
                          <strong>
                            {Number(assignment.students_submitted || 0)}
                          </strong>
                          <span>
                            {Number(assignment.graded_submissions || 0)} graded
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`assignment-status-badge ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
