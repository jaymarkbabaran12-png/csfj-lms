import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';
import './AdminReportsAnalytics.css';

const REPORTS = [
  { id: 'overview', label: 'Dashboard Reports', icon: '▦' },
  { id: 'users', label: 'User Reports', icon: '♙' },
  { id: 'academic', label: 'Academic Reports', icon: '⌂' },
  { id: 'enrollments', label: 'Enrollment Reports', icon: '▤' },
  { id: 'performance', label: 'Performance Analytics', icon: '▥' },
  { id: 'custom', label: 'Custom Reports', icon: '⚙' },
];

const ENDPOINTS = {
  overview: '/admin/reports/overview',
  users: '/admin/reports/users',
  academic: '/admin/reports/academic',
  enrollments: '/admin/reports/enrollments',
  performance: '/admin/reports/performance',
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString('en-PH');

const formatScore = (value) =>
  value === null || value === undefined || value === ''
    ? 'Not graded'
    : Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
};

function StatCard({ icon, label, value, color }) {
  return (
    <article className="ara-stat-card">
      <div className={`ara-stat-icon ${color}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{formatNumber(value)}</strong>
      </div>
    </article>
  );
}

function DataTable({ columns, rows, emptyMessage = 'Walang records na makita.' }) {
  return (
    <div className="ara-table-scroll">
      <table className="ara-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id ?? `${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="ara-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminReportsAnalytics() {
  const [activeReport, setActiveReport] = useState('overview');
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (activeReport === 'custom') {
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await apiRequest(ENDPOINTS[activeReport]);
        const result = response?.data ?? response;

        if (!cancelled) {
          setReportData((previous) => ({
            ...previous,
            [activeReport]: result,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              'Hindi ma-load ang report. Tingnan kung tumatakbo ang backend.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeReport]);

  const current = reportData[activeReport] || {};
  const overview = reportData.overview?.data || {};
  const users = current.data || [];
  const summary = current.summary || {};

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((row) => {
      const matchesSearch =
        !term ||
        Object.values(row).some((value) =>
          String(value ?? '').toLowerCase().includes(term)
        );

      const dateValue =
        row.created_at || row.enrolled_at || row.createdAt || null;

      if (!dateValue && (startDate || endDate)) return false;

      const date = dateValue ? new Date(dateValue) : null;

      const matchesStart =
        !startDate || (date && date >= new Date(`${startDate}T00:00:00`));

      const matchesEnd =
        !endDate || (date && date <= new Date(`${endDate}T23:59:59.999`));

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [users, search, startDate, endDate]);

  const currentLabel =
    REPORTS.find((report) => report.id === activeReport)?.label ||
    'Dashboard Reports';

  function downloadCsv() {
    let rows = [];
    let headers = [];

    if (activeReport === 'overview') {
      headers = ['Metric', 'Value'];
      rows = Object.entries(overview).map(([key, value]) => [key, value]);
    } else if (activeReport === 'users') {
      headers = ['ID', 'Username', 'Full Name', 'Email', 'Role', 'Created'];
      rows = filteredRows.map((row) => [
        row.id,
        row.username,
        row.full_name,
        row.email,
        row.role,
        formatDate(row.created_at),
      ]);
    } else if (activeReport === 'enrollments') {
      headers = [
        'Enrollment ID',
        'Student',
        'Username',
        'Course Code',
        'Course',
        'Status',
        'Enrolled At',
      ];
      rows = filteredRows.map((row) => [
        row.id,
        row.student_name,
        row.username,
        row.course_code,
        row.course_name,
        row.enrollment_status,
        formatDate(row.enrolled_at),
      ]);
    } else if (activeReport === 'academic') {
      headers = [
        'Course Code',
        'Course',
        'Instructor',
        'Enrollments',
        'Assignments',
        'Quizzes',
      ];
      rows = filteredRows.map((row) => [
        row.course_code,
        row.course_name,
        row.instructor_name,
        row.enrollment_count,
        row.assignment_count,
        row.quiz_count,
      ]);
    } else if (activeReport === 'performance') {
      headers = [
        'Student',
        'Username',
        'Course',
        'Assignment Score',
        'Quiz Score',
        'Final Grade',
        'Remarks',
      ];
      rows = filteredRows.map((row) => [
        row.student_name,
        row.username,
        row.course_name,
        row.assignment_score,
        row.quiz_score,
        row.final_grade,
        row.remarks,
      ]);
    } else {
      setError('Pumili muna ng report na may available na data.');
      return;
    }

    const escapeCsv = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `CSFJ-${activeReport}-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderReport() {
    if (activeReport === 'overview') {
      return (
        <>
          <div className="ara-stats-grid">
            <StatCard icon="♙" label="Total Users" value={overview.total_users} color="blue" />
            <StatCard icon="▣" label="Students" value={overview.total_students} color="gold" />
            <StatCard icon="♟" label="Instructors" value={overview.total_instructors} color="green" />
            <StatCard icon="▦" label="Courses" value={overview.total_courses} color="purple" />
            <StatCard icon="▤" label="Enrollments" value={overview.total_enrollments} color="blue" />
            <StatCard icon="▧" label="Assignments" value={overview.total_assignments} color="gold" />
            <StatCard icon="◉" label="Quizzes" value={overview.total_quizzes} color="green" />
            <StatCard icon="✓" label="Grade Records" value={overview.total_grade_records} color="purple" />
          </div>

          <div className="ara-panel">
            <div className="ara-panel-heading">
              <div>
                <h2>System Overview</h2>
                <p>Current counts from the CSFJ LMS database.</p>
              </div>
            </div>
            <DataTable
              columns={[
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Total', render: (value) => formatNumber(value) },
              ]}
              rows={[
                { id: 1, metric: 'Administrators', value: overview.total_admins },
                { id: 2, metric: 'Active Enrollments', value: overview.active_enrollments },
                { id: 3, metric: 'Courses', value: overview.total_courses },
                { id: 4, metric: 'Assignments', value: overview.total_assignments },
                { id: 5, metric: 'Quizzes', value: overview.total_quizzes },
              ]}
            />
          </div>
        </>
      );
    }

    if (activeReport === 'users') {
      const counts = current.summary || [];

      return (
        <>
          <div className="ara-stats-grid ara-stats-compact">
            {counts.map((item) => (
              <StatCard
                key={item.role}
                icon="♙"
                label={`${item.role} users`}
                value={item.total}
                color={item.role === 'admin' ? 'purple' : item.role === 'instructor' ? 'green' : 'blue'}
              />
            ))}
          </div>

          <div className="ara-panel">
            <div className="ara-panel-heading">
              <div>
                <h2>User Directory</h2>
                <p>Accounts registered in the system.</p>
              </div>
              <span className="ara-count">{filteredRows.length} records</span>
            </div>
            <DataTable
              columns={[
                { key: 'username', label: 'Username' },
                { key: 'full_name', label: 'Full Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (value) => <span className="ara-badge">{value}</span> },
                { key: 'created_at', label: 'Registered', render: formatDate },
              ]}
              rows={filteredRows}
            />
          </div>
        </>
      );
    }

    if (activeReport === 'enrollments') {
      const counts = current.summary || [];

      return (
        <>
          <div className="ara-stats-grid ara-stats-compact">
            {counts.map((item) => (
              <StatCard
                key={item.enrollment_status}
                icon="▤"
                label={`${item.enrollment_status} enrollments`}
                value={item.total}
                color={item.enrollment_status === 'active' ? 'green' : 'blue'}
              />
            ))}
          </div>

          <div className="ara-panel">
            <div className="ara-panel-heading">
              <div>
                <h2>Enrollment Records</h2>
                <p>Enrollment status and course information.</p>
              </div>
              <span className="ara-count">{filteredRows.length} records</span>
            </div>
            <DataTable
              columns={[
                { key: 'student_name', label: 'Student' },
                { key: 'course_code', label: 'Course Code' },
                { key: 'course_name', label: 'Course' },
                { key: 'enrollment_status', label: 'Status', render: (value) => <span className={`ara-badge ara-status-${value}`}>{value}</span> },
                { key: 'enrolled_at', label: 'Enrolled', render: formatDate },
              ]}
              rows={filteredRows}
            />
          </div>
        </>
      );
    }

    if (activeReport === 'academic') {
      return (
        <>
          <div className="ara-stats-grid ara-stats-compact">
            <StatCard icon="▦" label="Courses" value={summary.total_courses} color="blue" />
            <StatCard icon="⌂" label="Modules" value={summary.total_modules} color="gold" />
            <StatCard icon="▧" label="Assignments" value={summary.total_assignments} color="green" />
            <StatCard icon="◉" label="Quizzes" value={summary.total_quizzes} color="purple" />
          </div>

          <div className="ara-panel">
            <div className="ara-panel-heading">
              <div>
                <h2>Academic Course Report</h2>
                <p>Course activity and enrollment overview.</p>
              </div>
              <span className="ara-count">{filteredRows.length} courses</span>
            </div>
            <DataTable
              columns={[
                { key: 'course_code', label: 'Code' },
                { key: 'course_name', label: 'Course' },
                { key: 'instructor_name', label: 'Instructor' },
                { key: 'enrollment_count', label: 'Enrollments' },
                { key: 'assignment_count', label: 'Assignments' },
                { key: 'quiz_count', label: 'Quizzes' },
              ]}
              rows={filteredRows}
            />
          </div>
        </>
      );
    }

    if (activeReport === 'performance') {
      return (
        <>
          <div className="ara-stats-grid ara-stats-compact">
            <StatCard icon="✓" label="Grade Records" value={summary.total_grade_records} color="blue" />
            <StatCard icon="▧" label="Avg. Assignment Score" value={summary.average_assignment_score} color="gold" />
            <StatCard icon="◉" label="Avg. Quiz Score" value={summary.average_quiz_score} color="green" />
            <StatCard icon="★" label="Avg. Final Grade" value={summary.average_final_grade} color="purple" />
          </div>

          <div className="ara-panel">
            <div className="ara-panel-heading">
              <div>
                <h2>Student Performance</h2>
                <p>Scores and final grades recorded in the database.</p>
              </div>
              <span className="ara-count">{filteredRows.length} records</span>
            </div>
            <DataTable
              columns={[
                { key: 'student_name', label: 'Student' },
                { key: 'course_code', label: 'Course Code' },
                { key: 'course_name', label: 'Course' },
                { key: 'assignment_score', label: 'Assignment', render: formatScore },
                { key: 'quiz_score', label: 'Quiz', render: formatScore },
                { key: 'final_grade', label: 'Final Grade', render: formatScore },
                { key: 'remarks', label: 'Remarks' },
              ]}
              rows={filteredRows}
            />
          </div>
        </>
      );
    }

    return (
      <div className="ara-panel ara-custom-panel">
        <div className="ara-panel-heading">
          <div>
            <h2>Custom Reports</h2>
            <p>Pumili ng report at gumamit ng search o date range.</p>
          </div>
        </div>

        <div className="ara-custom-options">
          {REPORTS.filter((report) => report.id !== 'custom').map((report) => (
            <button
              type="button"
              className="ara-custom-option"
              key={report.id}
              onClick={() => {
                setSearch('');
                setStartDate('');
                setEndDate('');
                setActiveReport(report.id);
              }}
            >
              <span>{report.icon}</span>
              <strong>{report.label}</strong>
              <small>Open report →</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="ara-page">
      <header className="ara-heading">
        <div>
          <span className="ara-eyebrow">CSFJ LMS · ADMINISTRATION</span>
          <h1>Reports &amp; Analytics</h1>
          <p>Monitor users, academic activities, enrollments, and student performance.</p>
        </div>
        <div className="ara-heading-actions">
          <button
            type="button"
            className="ara-button ara-button-secondary"
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setActiveReport('overview');
            }}
          >
            Dashboard Reports
          </button>
          <button
            type="button"
            className="ara-button ara-button-primary"
            onClick={downloadCsv}
            disabled={activeReport === 'custom' || loading || !reportData[activeReport]}
          >
            ↓ Export CSV
          </button>
        </div>
      </header>

      <nav className="ara-report-nav" aria-label="Report categories">
        {REPORTS.map((report) => (
          <button
            type="button"
            key={report.id}
            className={`ara-report-tab ${activeReport === report.id ? 'active' : ''}`}
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setActiveReport(report.id);
            }}
          >
            <span>{report.icon}</span>
            {report.label}
          </button>
        ))}
      </nav>

      <div className="ara-toolbar">
        <div>
          <h2>{currentLabel}</h2>
          <p>Report data is retrieved from the CSFJ LMS database.</p>
        </div>

        {activeReport !== 'overview' && activeReport !== 'custom' && (
          <label className="ara-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report records..."
            />
          </label>
        )}
      </div>

      {activeReport !== 'overview' &&
        activeReport !== 'custom' && (
          <div className="ara-date-filters">
            <label>
              From
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="ara-button ara-button-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear dates
            </button>
          </div>
        )}

      {error && (
        <div className="ara-alert" role="alert">
          <strong>Hindi ma-load ang report.</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setActiveReport((value) => value)}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="ara-loading">
          <span className="ara-spinner" />
          <p>Loading {currentLabel.toLowerCase()}...</p>
        </div>
      ) : (
        renderReport()
      )}

      <footer className="ara-report-footer">
        <span>CSFJ LMS · Reports &amp; Analytics</span>
        <span>Data source: local LMS database</span>
      </footer>
    </section>
  );
}
