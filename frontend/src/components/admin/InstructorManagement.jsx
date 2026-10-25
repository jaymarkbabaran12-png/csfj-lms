import React, { useCallback, useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './InstructorManagement.css';

const EMPTY_FORM = {
  username: '',
  full_name: '',
  email: '',
  password: '',
};

function InstructorManagement() {
  const [instructors, setInstructors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordInstructor, setPasswordInstructor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadInstructors = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : '';

      const data = await apiRequest(`/admin/users${query}`);

      setInstructors(
        Array.isArray(data.users)
          ? data.users.filter((user) => user.role === 'instructor')
          : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load instructor records.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInstructors();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadInstructors]);

  const openAddForm = () => {
    setEditingInstructor(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const openEditForm = (instructor) => {
    setEditingInstructor(instructor);
    setForm({
      username: instructor.username || '',
      full_name: instructor.full_name || '',
      email: instructor.email || '',
      password: '',
    });
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingInstructor(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: 'instructor',
    };

    if (payload.username.length < 3 || payload.username.length > 100) {
      setError('Username must contain between 3 and 100 characters.');
      return;
    }

    if (payload.full_name.length < 2 || payload.full_name.length > 150) {
      setError('Full name must contain between 2 and 150 characters.');
      return;
    }

    if (
      payload.email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
    ) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!editingInstructor && form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSaving(true);

    try {
      if (editingInstructor) {
        await apiRequest(`/admin/users/${editingInstructor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setNotice('Instructor profile updated successfully.');
      } else {
        await apiRequest('/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            password: form.password,
          }),
        });

        setNotice('Instructor account created successfully.');
      }

      closeForm();
      await loadInstructors();
    } catch (err) {
      setError(err.message || 'Unable to save instructor information.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('Password must contain between 8 and 128 characters.');
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        `/admin/users/${passwordInstructor.id}/password`,
        {
          method: 'PATCH',
          body: JSON.stringify({ password: newPassword }),
        }
      );

      setNotice(
        `Password changed for ${passwordInstructor.username}.`
      );

      setPasswordInstructor(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Unable to change instructor password.');
    } finally {
      setSaving(false);
    }
  };

  const instructorForm = (compact = false) => (
    <form
      className={`im-form ${compact ? 'im-form-compact' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className="im-form-heading">
        <div>
          <h3>
            {editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}
          </h3>
          <p>Enter the instructor account information.</p>
        </div>

        <button
          type="button"
          className="im-close-button"
          onClick={closeForm}
          aria-label="Close form"
        >
          ×
        </button>
      </div>

      <div className="im-form-grid">
        <label className="im-field">
          <span>Username *</span>
          <input
            type="text"
            value={form.username}
            onChange={(event) =>
              updateField('username', event.target.value)
            }
            minLength={3}
            maxLength={100}
            autoComplete="username"
            required
          />
        </label>

        <label className="im-field">
          <span>Full Name *</span>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) =>
              updateField('full_name', event.target.value)
            }
            maxLength={150}
            autoComplete="name"
            required
          />
        </label>

        <label className="im-field im-field-full">
          <span>Email Address *</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              updateField('email', event.target.value)
            }
            maxLength={150}
            autoComplete="email"
            required
          />
        </label>

        {!editingInstructor && (
          <label className="im-field im-field-full">
            <span>Initial Password *</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                updateField('password', event.target.value)
              }
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
          </label>
        )}
      </div>

      <div className="im-form-actions">
        <button
          type="button"
          className="im-button im-button-secondary"
          onClick={closeForm}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="im-button im-button-primary"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : editingInstructor
              ? 'Save Changes'
              : 'Create Instructor'}
        </button>
      </div>
    </form>
  );

  return (
    <section className="im-page">
      <div className="im-page-header">
        <div>
          <span className="im-eyebrow">ADMINISTRATION</span>
          <h1>Instructor Management</h1>
          <p>Manage instructor accounts and profile information.</p>
        </div>

        <button
          type="button"
          className="im-button im-button-primary im-add-button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">+</span> Add Instructor
        </button>
      </div>

      {notice && (
        <div className="im-alert im-alert-success" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="im-alert im-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="im-summary">
        <div className="im-summary-icon" aria-hidden="true">
          👨‍🏫
        </div>
        <div>
          <span>Total Instructors</span>
          <strong>{loading ? '—' : instructors.length}</strong>
        </div>
      </div>

      <div className="im-toolbar">
        <div>
          <h2>Instructor Directory</h2>
          <p>View and manage registered instructor accounts.</p>
        </div>

        <label className="im-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search instructors..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search instructors"
          />
        </label>
      </div>

      {showForm && (
        <div className="im-panel">
          {instructorForm()}
        </div>
      )}

      <div className="im-table-card">
        {loading ? (
          <div className="im-state">
            <span className="im-spinner" />
            <p>Loading instructor records...</p>
          </div>
        ) : instructors.length === 0 ? (
          <div className="im-state">
            <div className="im-empty-icon" aria-hidden="true">
              👥
            </div>
            <h3>No instructors found</h3>
            <p>
              {search.trim()
                ? 'Try another search term.'
                : 'Add an instructor to get started.'}
            </p>
            {!search.trim() && (
              <button
                type="button"
                className="im-button im-button-primary"
                onClick={openAddForm}
              >
                Add First Instructor
              </button>
            )}
          </div>
        ) : (
          <div className="im-table-scroll">
            <table className="im-table">
              <thead>
                <tr>
                  <th>Instructor</th>
                  <th>Username</th>
                  <th>Email Address</th>
                  <th>Account Type</th>
                  <th className="im-actions-heading">Actions</th>
                </tr>
              </thead>

              <tbody>
                {instructors.map((instructor) => (
                  <tr key={instructor.id}>
                    <td>
                      <div className="im-person">
                        <div className="im-avatar">
                          {(instructor.full_name ||
                            instructor.username ||
                            'I')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="im-person-details">
                          <strong>
                            {instructor.full_name || 'Name not provided'}
                          </strong>
                          <span>
                            ID: {instructor.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="im-username">
                        {instructor.username}
                      </span>
                    </td>

                    <td>{instructor.email || '—'}</td>

                    <td>
                      <span className="im-role-pill">Instructor</span>
                    </td>

                    <td>
                      <div className="im-row-actions">
                        <button
                          type="button"
                          className="im-action-button im-edit-action"
                          onClick={() => openEditForm(instructor)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="im-action-button im-password-action"
                          onClick={() => {
                            setPasswordInstructor(instructor);
                            setNewPassword('');
                            setError('');
                            setNotice('');
                          }}
                        >
                          Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && instructors.length > 0 && (
          <div className="im-table-footer">
            Showing {instructors.length}{' '}
            {instructors.length === 1 ? 'instructor' : 'instructors'}
          </div>
        )}
      </div>

      {passwordInstructor && (
        <div
          className="im-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setPasswordInstructor(null);
              setNewPassword('');
            }
          }}
        >
          <div
            className="im-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="im-password-title"
          >
            <div className="im-modal-header">
              <div className="im-modal-icon" aria-hidden="true">
                🔒
              </div>
              <button
                type="button"
                className="im-close-button"
                onClick={() => {
                  setPasswordInstructor(null);
                  setNewPassword('');
                }}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <h2 id="im-password-title">Change Password</h2>
            <p>
              Set a new password for{' '}
              <strong>{passwordInstructor.username}</strong>.
            </p>

            <form onSubmit={handlePasswordChange}>
              <label className="im-field">
                <span>New Password *</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              <div className="im-form-actions">
                <button
                  type="button"
                  className="im-button im-button-secondary"
                  onClick={() => {
                    setPasswordInstructor(null);
                    setNewPassword('');
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="im-button im-button-primary"
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default InstructorManagement;
