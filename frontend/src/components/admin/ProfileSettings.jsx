import React, { useEffect, useState } from 'react';
import './ProfileSettings.css';
import apiRequest from '../../services/api';

export default function ProfileSettings({ username = 'Admin' }) {
  const [profile, setProfile] = useState({
    username,
    full_name: '',
    email: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await apiRequest('/auth/me');

        if (!cancelled && response?.user) {
          setProfile((previous) => ({
            ...previous,
            ...response.user,
            full_name: response.user.full_name || '',
            email: response.user.email || '',
          }));
        }
      } catch (err) {
        console.error('Unable to load profile:', err);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswords((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    setError(
      'Hindi pa nakakonekta ang profile update sa backend. Sa susunod na step, gagawa tayo ng secure na API para dito.'
    );
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (
      !passwords.currentPassword ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      setError('Punan ang lahat ng password fields.');
      return;
    }

    if (passwords.newPassword.length < 8) {
      setError('Ang bagong password ay dapat may hindi bababa sa 8 characters.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Hindi magkapareho ang bagong password at confirmation.');
      return;
    }

    setError(
      'Hindi pa nakakonekta ang password change sa backend. Ikokonekta natin ito sa susunod na step para ma-verify muna ang current password.'
    );
  };

  return (
    <section className="profile-settings-page">
      <div className="ps-page-heading">
        <div>
          <span className="ps-eyebrow">ACCOUNT CENTER</span>
          <h1>Profile &amp; Settings</h1>
          <p>Pamahalaan ang iyong account information at security settings.</p>
        </div>

        <div className="ps-account-badge">
          <span className="ps-account-avatar">
            {(profile.full_name || profile.username || 'A')
              .charAt(0)
              .toUpperCase()}
          </span>
          <div>
            <strong>{profile.full_name || profile.username || username}</strong>
            <span>Administrator Account</span>
          </div>
        </div>
      </div>

      <div className="ps-layout">
        <aside className="ps-sidebar">
          <div className="ps-sidebar-title">ACCOUNT SETTINGS</div>

          <button
            type="button"
            className={activeTab === 'profile' ? 'ps-nav-item active' : 'ps-nav-item'}
            onClick={() => {
              setActiveTab('profile');
              setMessage('');
              setError('');
            }}
          >
            <span className="ps-nav-icon">👤</span>
            <span>
              <strong>Personal Profile</strong>
              <small>Basic account information</small>
            </span>
          </button>

          <button
            type="button"
            className={activeTab === 'security' ? 'ps-nav-item active' : 'ps-nav-item'}
            onClick={() => {
              setActiveTab('security');
              setMessage('');
              setError('');
            }}
          >
            <span className="ps-nav-icon">🔒</span>
            <span>
              <strong>Security</strong>
              <small>Password and account safety</small>
            </span>
          </button>

          <div className="ps-sidebar-note">
            <span>🛡️</span>
            <div>
              <strong>Account Protection</strong>
              <p>Panatilihing pribado ang iyong login credentials.</p>
            </div>
          </div>
        </aside>

        <div className="ps-main">
          {activeTab === 'profile' ? (
            <form className="ps-card" onSubmit={handleProfileSubmit}>
              <div className="ps-card-heading">
                <div className="ps-card-icon">👤</div>
                <div>
                  <h2>Personal Profile</h2>
                  <p>Review your account information.</p>
                </div>
              </div>

              {error && <div className="ps-alert error">{error}</div>}
              {message && <div className="ps-alert success">{message}</div>}

              <div className="ps-form-grid">
                <label className="ps-field">
                  <span>Username</span>
                  <input
                    name="username"
                    value={profile.username || ''}
                    readOnly
                  />
                  <small>Ang username ay ginagamit sa pag-login.</small>
                </label>

                <label className="ps-field">
                  <span>Full Name</span>
                  <input
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleProfileChange}
                    placeholder="Enter your full name"
                    maxLength={150}
                  />
                </label>

                <label className="ps-field ps-full-width">
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                    placeholder="name@school.edu.ph"
                    maxLength={150}
                  />
                </label>
              </div>

              <div className="ps-form-footer">
                <span>Changes will require a connected profile API.</span>
                <button type="submit" className="ps-primary-button">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <form className="ps-card" onSubmit={handlePasswordSubmit}>
              <div className="ps-card-heading">
                <div className="ps-card-icon">🔒</div>
                <div>
                  <h2>Security Settings</h2>
                  <p>Keep your account credentials secure.</p>
                </div>
              </div>

              {error && <div className="ps-alert error">{error}</div>}
              {message && <div className="ps-alert success">{message}</div>}

              <div className="ps-security-notice">
                <strong>Security reminder</strong>
                <p>
                  Gumamit ng unique na password na may letters, numbers, at
                  symbols. Huwag ibahagi ang iyong password sa ibang tao.
                </p>
              </div>

              <div className="ps-form-grid ps-one-column">
                <label className="ps-field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </label>

                <label className="ps-field">
                  <span>New Password</span>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </label>

                <label className="ps-field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                </label>
              </div>

              <div className="ps-form-footer">
                <span>Never share your password with anyone.</span>
                <button type="submit" className="ps-primary-button">
                  Update Password
                </button>
              </div>
            </form>
          )}

          <div className="ps-info-card">
            <span className="ps-info-icon">ℹ️</span>
            <div>
              <strong>CSFJ LMS Account Information</strong>
              <p>
                Ang profile at security page na ito ay bahagi ng account
                management ng Colegio De San Francisco Javier LMS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}