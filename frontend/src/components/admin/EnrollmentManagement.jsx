import React, { useCallback, useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './EnrollmentManagement.css';

const EMPTY_FORM = {
  student_id: '',
  course_id: '',
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function EnrollmentManagement() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();

      if (search.trim()) {
        query.set('search', search.trim());
      }

      const [enrollmentData, optionData] = await Promise.all([
        apiRequest(`/admin/enrollments?${query.toString()}`),
        apiRequest('/admin/enrollment-options'),
      ]);

      setEnrollments(enrollmentData.enrollments || []);
      setStudents(optionData.students || []);
      setCourses(optionData.courses || []);
    } catch (err) {
      setError(err.message || 'Unable to load enrollment data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadData]);

  const activeCount = enrollments.filter(
    (item) => item.enrollment_status === 'active'
  ).length;

  const completedCount = enrollments.filter(
    (item) => item.enrollment_status === 'completed'
  ).length;

  const droppedCount = enrollments.filter(
    (item) => item.enrollment_status === 'dropped'
  ).length;

  function openModal() {
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setModalOpen(true);
  }

  function closeModal() {
    if (!saving) {
      setModalOpen(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!form.student_id || !form.course_id) {
      setError('Please select a student and a course.');
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest('/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          student_id: Number(form.student_id),
          course_id: Number(form.course_id),
        }),
      });

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setNotice(result.message || 'Student enrolled successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to create enrollment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(enrollmentId, status) {
    setError('');
    setNotice('');
    setUpdatingId(enrollmentId);

    try {
      const result = await apiRequest(
        `/admin/enrollments/${enrollmentId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );

      setNotice(result.message || 'Enrollment status updated.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to update enrollment status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(enrollment) {
    const studentName =
      enrollment.full_name || enrollment.username || 'this student';

    const confirmed = window.confirm(
      `Delete the enrollment of ${studentName} in ${enrollment.course_code}?\n\nThis removes only the enrollment record. The student account and course will remain.`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');
    setDeletingId(enrollment.id);

    try {
      const result = await apiRequest(
        `/admin/enrollments/${enrollment.id}`,
        { method: 'DELETE' }
      );

      setNotice(result.message || 'Enrollment deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete enrollment.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="enrollment-management">
      <header className="enrollment-page-header">
        <div>
          <p className="enrollment-eyebrow">ACADEMIC ADMINISTRATION</p>
          <h1>Enrollment Management</h1>
          <p className="enrollment-subtitle">
            Manage student course registrations and enrollment status.
          </p>
        </div>

        <button
          type="button"
          className="enrollment-primary-button"
          onClick={openModal}
        >
          <span aria-hidden="true">＋</span> Enroll Student
        </button>
      </header>

      {error && (
        <div className="enrollment-alert enrollment-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="enrollment-alert enrollment-alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="enrollment-stat-grid">
        <article className="enrollment-stat-card">
          <span className="enrollment-stat-icon">▤</span>
          <div>
            <p>Total Enrollments</p>
            <strong>{enrollments.length}</strong>
          </div>
        </article>

        <article className="enrollment-stat-card">
          <span className="enrollment-stat-icon">✓</span>
          <div>
            <p>Active</p>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article className="enrollment-stat-card">
          <span className="enrollment-stat-icon">▣</span>
          <div>
            <p>Completed</p>
            <strong>{completedCount}</strong>
          </div>
        </article>

        <article className="enrollment-stat-card">
          <span className="enrollment-stat-icon">↘</span>
          <div>
            <p>Dropped</p>
            <strong>{droppedCount}</strong>
          </div>
        </article>
      </div>

      <div className="enrollment-table-card">
        <div className="enrollment-table-toolbar">
          <div>
            <h2>Student Enrollments</h2>
            <p>Enrollment records stored in the CSFJ LMS database.</p>
          </div>

          <div className="enrollment-toolbar-actions">
            <label className="enrollment-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student or course..."
                aria-label="Search enrollments"
              />
            </label>

            <button
              type="button"
              className="enrollment-refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="enrollment-state">
            <span className="enrollment-spinner" />
            <p>Loading enrollment records...</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="enrollment-state">
            <div className="enrollment-empty-icon">▤</div>
            <h3>No enrollment records found</h3>
            <p>
              {search
                ? 'Try another search term.'
                : 'Enroll an existing student in an available course to get started.'}
            </p>

            {!search && (
              <button
                type="button"
                className="enrollment-primary-button"
                onClick={openModal}
              >
                ＋ Enroll Student
              </button>
            )}
          </div>
        ) : (
          <div className="enrollment-table-wrapper">
            <table className="enrollment-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Enrolled Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {enrollments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="enrollment-student-cell">
                        <div className="enrollment-avatar">
                          {(item.full_name || item.username || 'S')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {item.full_name || item.username || 'Unnamed Student'}
                          </strong>
                          <span>
                            {item.student_number || item.username || 'No student number'}
                          </span>
                          {item.email && <small>{item.email}</small>}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="enrollment-course-cell">
                        <strong>{item.course_code}</strong>
                        <span>{item.course_name}</span>
                      </div>
                    </td>

                    <td>{formatDate(item.enrolled_at)}</td>

                    <td>
                      <select
                        className={`enrollment-status-select status-${item.enrollment_status}`}
                        value={item.enrollment_status || 'active'}
                        disabled={
                          updatingId === item.id || deletingId === item.id
                        }
                        onChange={(event) =>
                          handleStatusChange(item.id, event.target.value)
                        }
                        aria-label={`Status for ${item.full_name || item.username}`}
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="dropped">Dropped</option>
                      </select>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="enrollment-delete-button"
                        disabled={
                          deletingId === item.id || updatingId === item.id
                        }
                        onClick={() => handleDelete(item)}
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="enrollment-table-footer">
          <span>
            Showing {enrollments.length} enrollment
            {enrollments.length === 1 ? '' : 's'}
          </span>
          <span>CSFJ LMS · Enrollment Records</span>
        </footer>
      </div>

      {modalOpen && (
        <div
          className="enrollment-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="enrollment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="enrollment-modal-title"
          >
            <header className="enrollment-modal-header">
              <div>
                <p className="enrollment-eyebrow">NEW REGISTRATION</p>
                <h2 id="enrollment-modal-title">Enroll Student</h2>
                <p>Select an existing student and course.</p>
              </div>

              <button
                type="button"
                className="enrollment-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form className="enrollment-form" onSubmit={handleCreate}>
              {students.length === 0 && (
                <div className="enrollment-alert enrollment-alert-error">
                  No student accounts are available. Create a student account
                  first in Student Management.
                </div>
              )}

              {courses.length === 0 && (
                <div className="enrollment-alert enrollment-alert-error">
                  No courses are available. Create a course first in Course
                  Management.
                </div>
              )}

              <label>
                Student <span>*</span>
                <select
                  value={form.student_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      student_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.username}
                      {student.student_id ? ` (${student.student_id})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Course <span>*</span>
                <select
                  value={form.course_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      course_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} — {course.course_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="enrollment-form-note">
                New enrollments are assigned the <strong>Active</strong> status.
                Existing student and course records will not be changed.
              </div>

              <footer className="enrollment-form-actions">
                <button
                  type="button"
                  className="enrollment-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="enrollment-primary-button"
                  disabled={
                    saving ||
                    students.length === 0 ||
                    courses.length === 0
                  }
                >
                  {saving ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default EnrollmentManagement;
