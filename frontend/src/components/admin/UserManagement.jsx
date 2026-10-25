import React, { useCallback, useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './UserManagement.css';

const EMPTY_FORM = {
  username: '',
  password: '',
  role: 'instructor',
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : '';

      const data = await apiRequest(`/admin/users${query}`);

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const openAddForm = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      role: user.role,
    });
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const username = form.username.trim();

    if (username.length < 3 || username.length > 100) {
      setError('Username must be between 3 and 100 characters.');
      return;
    }

    if (!editingUser && form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSaving(true);

    try {
      if (editingUser) {
        await apiRequest(`/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            username,
            role: form.role,
          }),
        });

        setNotice('User updated successfully.');
      } else {
        await apiRequest('/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password: form.password,
            role: form.role,
          }),
        });

        setNotice('New user created successfully.');
      }

      closeForm();
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Unable to save user.');
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
      await apiRequest(`/admin/users/${passwordUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      setNotice(`Password changed for ${passwordUser.username}.`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="um-page">
      <header className="um-header">
        <div>
          <p className="um-eyebrow">ADMINISTRATION</p>
          <h1>User Management</h1>
          <p className="um-description">
            Create accounts and manage access to the CSFJ LMS.
          </p>
        </div>

        <button
          type="button"
          className="um-primary-button"
          onClick={openAddForm}
        >
          + Add New User
        </button>
      </header>

      {error && (
        <div className="um-message um-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="um-message um-success" role="status">
          {notice}
        </div>
      )}

      <div className="um-toolbar">
        <div className="um-search-wrapper">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username..."
            aria-label="Search users by username"
          />
        </div>

        <span className="um-count">
          {loading ? 'Loading users...' : `${users.length} user(s)`}
        </span>
      </div>

      <div className="um-table-card">
        <div className="um-table-scroll">
          <table className="um-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="um-empty">
                    Loading users from the database...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="um-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>

                    <td className="um-username">
                      {user.username}
                    </td>

                    <td>
                      <span className={`um-role um-role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>

                    <td>
                      <div className="um-actions">
                        {user.role !== 'student' && (
                          <button
                            type="button"
                            className="um-text-button"
                            onClick={() => openEditForm(user)}
                          >
                            Edit
                          </button>
                        )}

                        <button
                          type="button"
                          className="um-text-button"
                          onClick={() => {
                            setPasswordUser(user);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="um-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-user-form-title"
          >
            <div className="um-modal-header">
              <div>
                <p className="um-eyebrow">
                  {editingUser ? 'EDIT ACCOUNT' : 'NEW ACCOUNT'}
                </p>
                <h2 id="um-user-form-title">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
              </div>

              <button
                type="button"
                className="um-close-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="um-field">
                <span>Username</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm({ ...form, username: event.target.value })
                  }
                  minLength={3}
                  maxLength={100}
                  autoComplete="off"
                  required
                />
              </label>

              {!editingUser && (
                <label className="um-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                  <small>Use at least 8 characters.</small>
                </label>
              )}

              <label className="um-field">
                <span>Role</span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Instructor</option>
                </select>
              </label>

              <div className="um-form-actions">
                <button
                  type="button"
                  className="um-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="um-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingUser
                      ? 'Save Changes'
                      : 'Create User'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordUser && (
        <div className="um-modal-backdrop">
          <section
            className="um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-password-title"
          >
            <div className="um-modal-header">
              <div>
                <p className="um-eyebrow">ACCOUNT SECURITY</p>
                <h2 id="um-password-title">Change Password</h2>
                <p className="um-description">
                  Account: {passwordUser.username}
                </p>
              </div>

              <button
                type="button"
                className="um-close-button"
                onClick={() => setPasswordUser(null)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordChange}>
              <label className="um-field">
                <span>New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <small>Use at least 8 characters.</small>
              </label>

              <div className="um-form-actions">
                <button
                  type="button"
                  className="um-secondary-button"
                  onClick={() => setPasswordUser(null)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="um-primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default UserManagement;
