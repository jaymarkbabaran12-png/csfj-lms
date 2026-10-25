import { useCallback, useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './CourseManagement.css';

const EMPTY_FORM = {
  course_code: '',
  course_name: '',
  description: '',
  instructor_id: '',
};

function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [courseResponse, instructorResponse] = await Promise.all([
        apiRequest(
          `/admin/courses?search=${encodeURIComponent(search.trim())}`
        ),
        apiRequest('/admin/instructors'),
      ]);

      setCourses(courseResponse.courses || []);
      setInstructors(instructorResponse.instructors || []);
    } catch (err) {
      setError(err.message || 'Failed to load course information.');
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

  function openCreateModal() {
    setEditingCourse(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setModalOpen(true);
  }

  function openEditModal(course) {
    setEditingCourse(course);
    setForm({
      course_code: course.course_code || '',
      course_name: course.course_name || '',
      description: course.description || '',
      instructor_id:
        course.instructor_id === null ||
        course.instructor_id === undefined
          ? ''
          : String(course.instructor_id),
    });

    setError('');
    setNotice('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingCourse(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setNotice('');

    if (!form.course_code.trim() || !form.course_name.trim()) {
      setError('Course code and course name are required.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        course_code: form.course_code.trim(),
        course_name: form.course_name.trim(),
        description: form.description.trim(),
        instructor_id: form.instructor_id || null,
      };

      if (editingCourse) {
        await apiRequest(`/admin/courses/${editingCourse.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setNotice('Course updated successfully.');
      } else {
        await apiRequest('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setNotice('Course created successfully.');
      }

      setModalOpen(false);
      setEditingCourse(null);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to save course.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Delete ${course.course_code} — ${course.course_name}?\n\n` +
        'This action may be blocked if the course has enrollment or other related records.'
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      const response = await apiRequest(`/admin/courses/${course.id}`, {
        method: 'DELETE',
      });

      setNotice(response.message || 'Course deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete course.');
    }
  }

  const totalCourses = courses.length;
  const assignedCourses = courses.filter(
    (course) => course.instructor_id !== null
  ).length;

  const totalStudents = courses.reduce(
    (total, course) => total + Number(course.enrolled_students || 0),
    0
  );

  return (
    <section className="course-management">
      <div className="cm-page-heading">
        <div>
          <span className="cm-eyebrow">ACADEMIC ADMINISTRATION</span>
          <h1>Course Management</h1>
          <p>
            Create courses, manage course details, and assign instructors.
          </p>
        </div>

        <button
          type="button"
          className="cm-primary-button"
          onClick={openCreateModal}
        >
          <span aria-hidden="true">＋</span> Add Course
        </button>
      </div>

      {error && !modalOpen && (
        <div className="cm-alert cm-alert-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="cm-alert cm-alert-success" role="status">
          {notice}
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <div className="cm-stat-grid">
        <article className="cm-stat-card">
          <div className="cm-stat-icon">▤</div>
          <div>
            <span>Total Courses</span>
            <strong>{loading ? '—' : totalCourses}</strong>
          </div>
        </article>

        <article className="cm-stat-card">
          <div className="cm-stat-icon">♙</div>
          <div>
            <span>Assigned Courses</span>
            <strong>{loading ? '—' : assignedCourses}</strong>
          </div>
        </article>

        <article className="cm-stat-card">
          <div className="cm-stat-icon">♧</div>
          <div>
            <span>Active Enrollments</span>
            <strong>{loading ? '—' : totalStudents}</strong>
          </div>
        </article>
      </div>

      <div className="cm-content-card">
        <div className="cm-toolbar">
          <div>
            <h2>All Courses</h2>
            <p>Manage courses stored in the CSFJ LMS database.</p>
          </div>

          <label className="cm-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search courses or instructors..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="cm-table-wrapper">
          <table className="cm-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Description</th>
                <th>Instructor</th>
                <th>Students</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="cm-empty">
                    Loading courses...
                  </td>
                </tr>
              ) : error && courses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="cm-empty">
                    Could not load courses. Please retry.
                    <button
                      type="button"
                      className="cm-retry-button"
                      onClick={loadData}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="cm-empty">
                    <div className="cm-empty-icon">▤</div>
                    <strong>No courses found</strong>
                    <p>
                      {search
                        ? 'Try another search keyword.'
                        : 'Add your first course to get started.'}
                    </p>
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="cm-course-code">
                        {course.course_code}
                      </div>
                      <div className="cm-course-name">
                        {course.course_name}
                      </div>
                    </td>

                    <td className="cm-description">
                      {course.description || 'No description'}
                    </td>

                    <td>
                      {course.instructor_name ||
                      course.instructor_username ? (
                        <div className="cm-instructor">
                          <span className="cm-avatar">
                            {(
                              course.instructor_name ||
                              course.instructor_username
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span>
                            {course.instructor_name ||
                              course.instructor_username}
                          </span>
                        </div>
                      ) : (
                        <span className="cm-unassigned">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="cm-student-count">
                        {Number(course.enrolled_students || 0)}
                      </span>
                    </td>

                    <td>
                      <div className="cm-actions">
                        <button
                          type="button"
                          className="cm-edit-button"
                          onClick={() => openEditModal(course)}
                          aria-label={`Edit ${course.course_code}`}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="cm-delete-button"
                          onClick={() => handleDelete(course)}
                          aria-label={`Delete ${course.course_code}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="cm-table-footer">
          <span>
            {loading
              ? 'Loading...'
              : `${courses.length} course${courses.length === 1 ? '' : 's'} displayed`}
          </span>

          <button
            type="button"
            className="cm-refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="cm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="cm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-modal-title"
          >
            <div className="cm-modal-heading">
              <div>
                <span className="cm-eyebrow">COURSE DETAILS</span>
                <h2 id="cm-modal-title">
                  {editingCourse ? 'Edit Course' : 'Add New Course'}
                </h2>
                <p>
                  Enter the course information below.
                </p>
              </div>

              <button
                type="button"
                className="cm-close-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="cm-alert cm-alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="cm-form-grid">
                <label className="cm-field">
                  <span>Course Code *</span>
                  <input
                    name="course_code"
                    value={form.course_code}
                    onChange={handleChange}
                    placeholder="e.g. IT-301"
                    maxLength={50}
                    required
                  />
                </label>

                <label className="cm-field">
                  <span>Course Name *</span>
                  <input
                    name="course_name"
                    value={form.course_name}
                    onChange={handleChange}
                    placeholder="Enter course name"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="cm-field cm-field-full">
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the course..."
                    rows={4}
                  />
                </label>

                <label className="cm-field cm-field-full">
                  <span>Assign Instructor</span>
                  <select
                    name="instructor_id"
                    value={form.instructor_id}
                    onChange={handleChange}
                  >
                    <option value="">No instructor assigned</option>

                    {instructors.map((instructor) => (
                      <option
                        key={instructor.id}
                        value={String(instructor.id)}
                      >
                        {instructor.full_name ||
                          instructor.username}
                        {instructor.email
                          ? ` — ${instructor.email}`
                          : ''}
                      </option>
                    ))}
                  </select>

                  {instructors.length === 0 && (
                    <small>
                      No instructor accounts found. Create an instructor
                      account in User Management first.
                    </small>
                  )}
                </label>
              </div>

              <div className="cm-modal-actions">
                <button
                  type="button"
                  className="cm-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cm-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingCourse
                      ? 'Save Changes'
                      : 'Create Course'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default CourseManagement;
