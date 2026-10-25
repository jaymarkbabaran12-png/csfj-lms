import React, { useEffect, useState } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
    color: '#102f68',
  },
  heading: {
    marginBottom: '8px',
    fontSize: '28px',
  },
  description: {
    color: '#64748b',
    marginBottom: '24px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
  },
  button: {
    background: '#082b69',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px',
    marginTop: '6px',
    marginBottom: '16px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
  },
  label: {
    display: 'block',
    fontWeight: '600',
    marginTop: '12px',
  },
};

const pageDescriptions = {
  Assignments: 'View your assignments, due dates, and submission status.',
  'My Submissions': 'Review assignments that you have submitted.',
  'My Grades': 'View grades and feedback released by your instructor.',
  'Profile & Settings': 'View and update your account information.',
};

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed. Please try again.');
  }

  return data;
}

function getArray(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return 'Not specified';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function getStatus(assignment) {
  if (assignment.submission_status) {
    return assignment.submission_status;
  }

  if (assignment.submission_id || assignment.submitted_at) {
    return 'Submitted';
  }

  if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
    return 'Overdue';
  }

  return 'Pending';
}

function StudentLearningPages({ activeMenu, setActiveMenu }) {
  const [assignments, setAssignments] = useState([]);
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        if (
          activeMenu === 'Assignments' ||
          activeMenu === 'My Submissions' ||
          activeMenu === 'My Grades'
        ) {
          const data = await apiRequest('/student/assignments');
          const rows = getArray(data, 'assignments');

          if (!cancelled) {
            setAssignments(rows);
          }
        } else if (activeMenu === 'Profile & Settings') {
          const data = await apiRequest('/auth/profile');
          const user = data.user || data.profile || {};

          if (!cancelled) {
            setProfile({
              full_name: user.full_name || '',
              username: user.username || '',
              email: user.email || '',
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load this page.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [activeMenu]);

  async function handleProfileSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });

      const user = data.user || data.profile;

      if (user) {
        setProfile({
          full_name: user.full_name || '',
          username: user.username || '',
          email: user.email || '',
        });
      }

      setMessage(data.message || 'Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  const filteredAssignments = assignments.filter((assignment) => {
    if (activeMenu === 'My Submissions') {
      return Boolean(
        assignment.submission_id || assignment.submitted_at
      );
    }

    if (activeMenu === 'My Grades') {
      return (
        assignment.score !== null &&
        assignment.score !== undefined &&
        assignment.score !== ''
      );
    }

    return true;
  });

  return (
    <section style={styles.container}>
      <h1 style={styles.heading}>{activeMenu}</h1>

      <p style={styles.description}>
        {pageDescriptions[activeMenu] || 'Student learning portal.'}
      </p>

      {error && (
        <div
          role="alert"
          style={{
            ...styles.card,
            color: '#b91c1c',
            borderColor: '#fecaca',
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            ...styles.card,
            color: '#166534',
            borderColor: '#bbf7d0',
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div style={styles.card}>Loading {activeMenu.toLowerCase()}...</div>
      ) : activeMenu === 'Profile & Settings' ? (
        <form style={styles.card} onSubmit={handleProfileSave}>
          <h2>My Account</h2>

          <label style={styles.label} htmlFor="student-full-name">
            Full Name
          </label>
          <input
            id="student-full-name"
            style={styles.input}
            value={profile.full_name}
            onChange={(event) =>
              setProfile({ ...profile, full_name: event.target.value })
            }
            required
          />

          <label style={styles.label} htmlFor="student-username">
            Username
          </label>
          <input
            id="student-username"
            style={styles.input}
            value={profile.username}
            onChange={(event) =>
              setProfile({ ...profile, username: event.target.value })
            }
            required
          />

          <label style={styles.label} htmlFor="student-email">
            Email
          </label>
          <input
            id="student-email"
            type="email"
            style={styles.input}
            value={profile.email}
            onChange={(event) =>
              setProfile({ ...profile, email: event.target.value })
            }
          />

          <button
            type="submit"
            style={styles.button}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      ) : filteredAssignments.length === 0 ? (
        <div style={styles.card}>
          <h2>No records yet</h2>
          <p>
            {activeMenu === 'Assignments'
              ? 'There are currently no assignments available for your account.'
              : activeMenu === 'My Submissions'
                ? 'You have no submitted assignments recorded yet.'
                : 'No graded assignments are available yet.'}
          </p>

          <button
            type="button"
            style={styles.button}
            onClick={() => setActiveMenu('My Courses')}
          >
            Go to My Courses
          </button>
        </div>
      ) : (
        filteredAssignments.map((assignment) => (
          <article
            key={assignment.assignment_id || assignment.id}
            style={styles.card}
          >
            <h2>
              {assignment.title || 'Untitled Assignment'}
            </h2>

            <p>
              <strong>Course:</strong>{' '}
              {assignment.course_name || assignment.course_code || 'Not specified'}
            </p>

            {assignment.description && (
              <p>{assignment.description}</p>
            )}

            <p>
              <strong>Due Date:</strong>{' '}
              {formatDate(assignment.due_date)}
            </p>

            <p>
              <strong>Points:</strong>{' '}
              {assignment.points ?? 'Not specified'}
            </p>

            {activeMenu === 'Assignments' && (
              <p>
                <strong>Status:</strong> {getStatus(assignment)}
              </p>
            )}

            {activeMenu === 'My Submissions' && (
              <>
                <p>
                  <strong>Submitted:</strong>{' '}
                  {formatDate(assignment.submitted_at)}
                </p>
                <p>
                  <strong>Submission Status:</strong> Submitted
                </p>
              </>
            )}

            {activeMenu === 'My Grades' && (
              <>
                <p>
                  <strong>Score:</strong> {assignment.score}
                  {assignment.points != null
                    ? ` / ${assignment.points}`
                    : ''}
                </p>

                <p>
                  <strong>Feedback:</strong>{' '}
                  {assignment.feedback || 'No feedback provided.'}
                </p>

                <p>
                  <strong>Graded Date:</strong>{' '}
                  {formatDate(assignment.graded_at)}
                </p>
              </>
            )}
          </article>
        ))
      )}
    </section>
  );
}

export default StudentLearningPages;
