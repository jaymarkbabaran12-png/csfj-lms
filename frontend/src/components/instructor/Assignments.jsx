import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import './Assignments.css';

export default function Assignments() {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = {
    title: '',
    description: '',
    module_id: '',
    due_date: '',
    points: 100,
  };

  const [form, setForm] = useState(emptyForm);

  const loadCourses = useCallback(async () => {
    try {
      const response = await apiRequest('/instructor/courses');
      const list = Array.isArray(response)
        ? response
        : response?.courses || response?.data || [];

      setCourses(list);

      if (list.length > 0) {
        setCourseId((current) => {
          if (current && list.some((course) => String(course.id) === String(current))) {
            return current;
          }
          return String(list[0].id);
        });
      } else {
        setCourseId('');
      }
    } catch (err) {
      setError(err.message || 'Hindi ma-load ang courses.');
    }
  }, []);

  const loadCourseData = useCallback(async () => {
    if (!courseId) {
      setModules([]);
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [moduleResponse, assignmentResponse] = await Promise.all([
        apiRequest(`/instructor/courses/${courseId}/modules`),
        apiRequest(`/instructor/courses/${courseId}/assignments`),
      ]);

      setModules(
        Array.isArray(moduleResponse)
          ? moduleResponse
          : moduleResponse?.modules || moduleResponse?.data || []
      );

      setAssignments(
        Array.isArray(assignmentResponse)
          ? assignmentResponse
          : assignmentResponse?.assignments || assignmentResponse?.data || []
      );
    } catch (err) {
      setError(err.message || 'Hindi ma-load ang assignments.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  function startEdit(assignment) {
    setEditingId(assignment.id);
    setForm({
      title: assignment.title || '',
      description: assignment.description || '',
      module_id: assignment.module_id ? String(assignment.module_id) : '',
      due_date: assignment.due_date
        ? String(assignment.due_date).slice(0, 16).replace(' ', 'T')
        : '',
      points: assignment.points ?? 100,
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!courseId) {
      setError('Pumili muna ng course.');
      return;
    }

    if (!form.title.trim()) {
      setError('Kailangan ang assignment title.');
      return;
    }

    if (Number(form.points) <= 0 || !Number.isFinite(Number(form.points))) {
      setError('Maglagay ng valid na points na higit sa zero.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      module_id: form.module_id ? Number(form.module_id) : null,
      due_date: form.due_date || null,
      points: Number(form.points),
    };

    try {
      if (editingId) {
        await apiRequest(`/instructor/assignments/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setSuccess('Matagumpay na na-update ang assignment.');
      } else {
        await apiRequest(`/instructor/courses/${courseId}/assignments`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setSuccess('Matagumpay na naidagdag ang assignment.');
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadCourseData();
    } catch (err) {
      setError(err.message || 'Hindi na-save ang assignment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assignment) {
    const confirmed = window.confirm(
      `Sigurado ka bang ide-delete ang "${assignment.title}"?`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');

    try {
      await apiRequest(`/instructor/assignments/${assignment.id}`, {
        method: 'DELETE',
      });

      setSuccess('Matagumpay na na-delete ang assignment.');
      if (String(editingId) === String(assignment.id)) {
        resetForm();
      }

      await loadCourseData();
    } catch (err) {
      setError(err.message || 'Hindi ma-delete ang assignment.');
    }
  }

  function formatDate(value) {
    if (!value) return 'Walang deadline';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  return (
    <section className="instructor-assignments">
      <header className="assignments-heading">
        <div>
          <span className="assignments-eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Assignments</h1>
          <p>Gumawa, mag-update, at mamahala ng course assignments.</p>
        </div>

        <div className="assignments-total">
          <strong>{assignments.length}</strong>
          <span>Assignments</span>
        </div>
      </header>

      {error && <div className="assignment-alert error">{error}</div>}
      {success && <div className="assignment-alert success">{success}</div>}

      <section className="assignment-panel">
        <div className="assignment-panel-heading">
          <h2>Course Selection</h2>
          <span>Pumili ng course na naka-assign sa iyo.</span>
        </div>

        <select
          className="assignment-input"
          value={courseId}
          onChange={(event) => {
            setCourseId(event.target.value);
            setForm(emptyForm);
            setEditingId(null);
            setSuccess('');
          }}
        >
          {courses.length === 0 && <option value="">Walang assigned courses</option>}

          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.course_code
                ? `${course.course_code} — ${course.course_name}`
                : course.course_name}
            </option>
          ))}
        </select>
      </section>

      <section className="assignment-panel">
        <div className="assignment-panel-heading">
          <h2>{editingId ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <span>
            {editingId
              ? 'Baguhin ang detalye at i-save ang updates.'
              : 'Punan ang impormasyon ng bagong assignment.'}
          </span>
        </div>

        <form className="assignment-form" onSubmit={handleSubmit}>
          <label>
            Assignment Title <span>*</span>
            <input
              className="assignment-input"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Hal. Laboratory Exercise 1"
              required
            />
          </label>

          <label>
            Module
            <select
              className="assignment-input"
              name="module_id"
              value={form.module_id}
              onChange={handleChange}
            >
              <option value="">Walang module / General Assignment</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </label>

          <label className="assignment-full">
            Description / Instructions
            <textarea
              className="assignment-input"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              placeholder="Ilagay ang instructions ng assignment..."
            />
          </label>

          <label>
            Due Date
            <input
              className="assignment-input"
              type="datetime-local"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
            />
          </label>

          <label>
            Maximum Points <span>*</span>
            <input
              className="assignment-input"
              type="number"
              name="points"
              min="1"
              step="1"
              value={form.points}
              onChange={handleChange}
              required
            />
          </label>

          <div className="assignment-form-actions assignment-full">
            <button
              className="assignment-button primary"
              type="submit"
              disabled={saving || !courseId}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Create Assignment'}
            </button>

            {editingId && (
              <button
                className="assignment-button secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="assignment-panel">
        <div className="assignment-panel-heading assignment-list-heading">
          <div>
            <h2>Assignment List</h2>
            <span>Mga assignment para sa napiling course.</span>
          </div>
          <button
            className="assignment-button secondary"
            type="button"
            onClick={loadCourseData}
            disabled={loading || !courseId}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="assignment-empty">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="assignment-empty">
            Wala pang assignment sa course na ito.
          </p>
        ) : (
          <div className="assignment-list">
            {assignments.map((assignment) => (
              <article className="assignment-card" key={assignment.id}>
                <div className="assignment-card-main">
                  <div className="assignment-card-title-row">
                    <h3>{assignment.title}</h3>
                    <span className="assignment-points">
                      {assignment.points ?? 100} points
                    </span>
                  </div>

                  <p className="assignment-description">
                    {assignment.description || 'Walang description.'}
                  </p>

                  <div className="assignment-meta">
                    <span>
                      Module: {assignment.module_title || 'General Assignment'}
                    </span>
                    <span>Due: {formatDate(assignment.due_date)}</span>
                    <span>
                      Submissions: {assignment.submission_count ?? 0}
                    </span>
                  </div>
                </div>

                <div className="assignment-card-actions">
                  <button
                    className="assignment-button secondary"
                    type="button"
                    onClick={() => startEdit(assignment)}
                  >
                    Edit
                  </button>
                  <button
                    className="assignment-button danger"
                    type="button"
                    onClick={() => handleDelete(assignment)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
