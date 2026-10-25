import React, { useCallback, useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './StudentManagement.css';

const EMPTY_FORM = {
  student_id: '',
  username: '',
  full_name: '',
  email: '',
  course: '',
  year_level: '',
  password: '',
};

function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordStudent, setPasswordStudent] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : '';
      const data = await apiRequest(`/admin/users${query}`);
      setStudents(
        Array.isArray(data.users)
          ? data.users.filter((user) => user.role === 'student')
          : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load student records.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => loadStudents(), 250);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  const openAddForm = () => {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const openEditForm = (student) => {
    setEditingStudent(student);
    setForm({
      student_id: student.student_id || '',
      username: student.username || '',
      full_name: student.full_name || '',
      email: student.email || '',
      course: student.course || '',
      year_level: student.year_level || '',
      password: '',
    });
    setError('');
    setNotice('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      student_id: form.student_id.trim(),
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      course: form.course.trim(),
      year_level: form.year_level.trim(),
      role: 'student',
    };

    if (payload.student_id.length < 2) {
      setError('Please enter a valid Student ID.');
      return;
    }
    if (payload.username.length < 3 || payload.username.length > 100) {
      setError('Username must be between 3 and 100 characters.');
      return;
    }
    if (payload.full_name.length < 2) {
      setError('Please enter the student full name.');
      return;
    }
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!payload.course) {
      setError('Please enter the student course.');
      return;
    }
    if (!payload.year_level) {
      setError('Please select the student year level.');
      return;
    }
    if (!editingStudent && form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      if (editingStudent) {
        await apiRequest(`/admin/users/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotice('Student profile updated successfully.');
      } else {
        await apiRequest('/admin/users', {
          method: 'POST',
          body: JSON.stringify({ ...payload, password: form.password }),
        });
        setNotice('Student account created successfully.');
      }
      closeForm();
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Unable to save student information.');
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
      await apiRequest(`/admin/users/${passwordStudent.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setNotice(`Password changed for ${passwordStudent.username}.`);
      setPasswordStudent(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Unable to change student password.');
    } finally {
      setSaving(false);
    }
  };

  const studentForm = (compact = false) => (
    <form onSubmit={handleSubmit} className={compact ? 'sm-form sm-form-compact' : 'sm-form'}>
      <div className="sm-form-grid">
        <label className="sm-field">
          <span>Student ID <b>*</b></span>
          <input
            type="text"
            value={form.student_id}
            onChange={(event) => updateField('student_id', event.target.value)}
            placeholder="e.g. 2026-0001"
            maxLength={50}
            required
            autoFocus
          />
        </label>
        <label className="sm-field">
          <span>Username <b>*</b></span>
          <input
            type="text"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="e.g. juan.delacruz"
            minLength={3}
            maxLength={100}
            autoComplete="username"
            required
          />
        </label>
        <label className="sm-field sm-field-full">
          <span>Full Name <b>*</b></span>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => updateField('full_name', event.target.value)}
            placeholder="Enter full name"
            maxLength={150}
            required
          />
        </label>
        <label className="sm-field sm-field-full">
          <span>Email Address <b>*</b></span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="student@example.com"
            maxLength={150}
            autoComplete="email"
            required
          />
        </label>
        <label className="sm-field">
          <span>Course <b>*</b></span>
          <select value={form.course} onChange={(event) => updateField('course', event.target.value)} required>
            <option value="">Select course</option>
            <option value="BSIT">BSIT - Information Technology</option>
            <option value="BSCS">BSCS - Computer Science</option>
            <option value="BSBA">BSBA - Business Administration</option>
            <option value="BSED">BSED - Secondary Education</option>
            <option value="BEED">BEED - Elementary Education</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="sm-field">
          <span>Year Level <b>*</b></span>
          <select value={form.year_level} onChange={(event) => updateField('year_level', event.target.value)} required>
            <option value="">Select year level</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="5th Year">5th Year</option>
          </select>
        </label>
        {!editingStudent && (
          <label className="sm-field sm-field-full">
            <span>Initial Password <b>*</b></span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Create an initial password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <small>Use at least 8 characters.</small>
          </label>
        )}
      </div>
      <div className="sm-readonly-role">
        <span>Account role</span><strong>Student</strong>
      </div>
      <div className="sm-form-actions">
        <button type="button" className="sm-secondary-button" onClick={closeForm} disabled={saving}>Cancel</button>
        <button type="submit" className="sm-primary-button" disabled={saving}>
          {saving ? 'Saving...' : editingStudent ? 'Save Changes' : 'Create Student'}
        </button>
      </div>
    </form>
  );

  return (
    <section className="sm-page">
      <header className="sm-header">
        <div className="sm-heading-group">
          <span className="sm-heading-icon" aria-hidden="true">♙</span>
          <div>
            <p className="sm-eyebrow">ADMINISTRATION</p>
            <h1>Student Management</h1>
            <p className="sm-description">Manage student accounts and academic profiles in the CSFJ LMS.</p>
          </div>
        </div>
        <button type="button" className="sm-primary-button sm-header-add" onClick={openAddForm}>＋ Add Student</button>
      </header>

      {error && <div className="sm-message sm-error" role="alert">{error}</div>}
      {notice && <div className="sm-message sm-success" role="status">{notice}</div>}

      <div className="sm-summary-grid">
        <article className="sm-summary-card">
          <span className="sm-summary-icon sm-blue-icon">♟</span>
          <div><p>Total Students</p><strong>{loading ? '—' : students.length}</strong><small>Registered student accounts</small></div>
        </article>
        <article className="sm-summary-card">
          <span className="sm-summary-icon sm-green-icon">▣</span>
          <div><p>Account Type</p><strong>Student</strong><small>Student role accounts</small></div>
        </article>
        <article className="sm-summary-card">
          <span className="sm-summary-icon sm-gold-icon">✓</span>
          <div><p>Profiles</p><strong>{loading ? '—' : students.filter((s) => s.full_name && s.email).length}</strong><small>With name and email</small></div>
        </article>
        <article className="sm-summary-card">
          <span className="sm-summary-icon sm-purple-icon">⌕</span>
          <div><p>Search</p><strong>{search.trim() ? 'Active' : 'Ready'}</strong><small>Find a student quickly</small></div>
        </article>
      </div>

      <div className={`sm-workspace ${showForm ? 'sm-workspace-form-open' : ''}`}>
        <div className="sm-table-card">
          <div className="sm-toolbar">
            <div>
              <h2>Student Directory</h2>
              <p>View and manage student records</p>
            </div>
            <div className="sm-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, name, username, email, or course..." aria-label="Search student records" />
            </div>
          </div>

          <div className="sm-table-scroll">
            <table className="sm-table">
              <thead><tr><th>#</th><th>Student ID</th><th>Student Information</th><th>Course</th><th>Year Level</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="sm-empty"><span className="sm-loader" />Loading student records...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan="7" className="sm-empty">No student accounts found. Try another search or add a student.</td></tr>
                ) : students.map((student, index) => (
                  <tr key={student.id}>
                    <td className="sm-row-number">{index + 1}</td>
                    <td><span className="sm-student-id">{student.student_id || 'Not assigned'}</span></td>
                    <td>
                      <div className="sm-user-cell">
                        <span className="sm-avatar">{(student.full_name || student.username || 'S').charAt(0).toUpperCase()}</span>
                        <div className="sm-student-info">
                          <strong>{student.full_name || 'Name not provided'}</strong>
                          <span>@{student.username}</span>
                          <span>{student.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{student.course || '—'}</td>
                    <td>{student.year_level || '—'}</td>
                    <td><span className="sm-status-badge">Active</span></td>
                    <td><div className="sm-actions">
                      <button type="button" className="sm-action-button" onClick={() => openEditForm(student)}>✎ Edit</button>
                      <button type="button" className="sm-action-button sm-password-button" onClick={() => { setPasswordStudent(student); setNewPassword(''); setError(''); setNotice(''); }}>⌑ Password</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="sm-table-footer">
            <span>{loading ? 'Loading...' : `Showing ${students.length} student${students.length === 1 ? '' : 's'}`}</span>
            <span className="sm-footer-note">CSFJ LMS · Student Directory</span>
          </footer>
        </div>

        {showForm && (
          <aside className="sm-form-panel">
            <header className="sm-panel-header">
              <span className="sm-panel-icon">＋</span>
              <div><h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2><p>Enter account and academic details</p></div>
              <button type="button" className="sm-close-button" onClick={closeForm} aria-label="Close form">×</button>
            </header>
            {studentForm(true)}
          </aside>
        )}
      </div>

      {passwordStudent && (
        <div className="sm-modal-backdrop">
          <section className="sm-modal" role="dialog" aria-modal="true" aria-labelledby="sm-password-title">
            <header className="sm-modal-header">
              <div><p className="sm-eyebrow">ACCOUNT SECURITY</p><h2 id="sm-password-title">Change Password</h2><p className="sm-description">Student: {passwordStudent.username}</p></div>
              <button type="button" className="sm-close-button" onClick={() => { setPasswordStudent(null); setNewPassword(''); }} aria-label="Close password form">×</button>
            </header>
            <form onSubmit={handlePasswordChange}>
              <label className="sm-field">
                <span>New Password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required autoFocus />
                <small>The new password must contain at least 8 characters.</small>
              </label>
              <footer className="sm-modal-footer">
                <button type="button" className="sm-secondary-button" onClick={() => { setPasswordStudent(null); setNewPassword(''); }} disabled={saving}>Cancel</button>
                <button type="submit" className="sm-primary-button" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default StudentManagement;
