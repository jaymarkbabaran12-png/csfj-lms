import React, { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Assets
import schoolBuilding from './assets/building.jpeg';
import schoolLogo from './assets/logo.jpg';

// Admin components
import ProfileSettings from './components/admin/ProfileSettings';
import StudentManagement from './components/admin/StudentManagement';
import InstructorManagement from './components/admin/InstructorManagement';
import AdminAssignmentManagement from './components/admin/AdminAssignmentManagement';
import AdminQuizManagement from './components/admin/AdminQuizManagement';
import AdminReportsAnalytics from './components/admin/AdminReportsAnalytics';
import AcademicManagement from './components/admin/AcademicManagement';
import UserManagement from './components/admin/UserManagement';
import CourseManagement from './components/admin/CourseManagement';
import EnrollmentManagement from './components/admin/EnrollmentManagement';

// Dashboard components
import AdminDashboard from './components/dashboard/AdminDashboard';
import InstructorDashboard from './components/dashboard/InstructorDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';

// Instructor components
import Modules from './components/instructor/Modules';
import StudentList from './components/instructor/StudentList';
import Assignments from './components/instructor/Assignments';
import Submissions from './components/instructor/Submissions';
import Grades from './components/instructor/Grades';
import InstructorMyCourses from './components/instructor/InstructorMyCourses';

// Student components
import MyCourses from './components/student/MyCourses';
import CourseDetails from './components/student/CourseDetails';
import StudentLearningPages from './components/student/StudentLearningPages';

// Services and configuration
import authService from './services/authService';
import roleMenus from './constants/roleMenus';

import {
  initialActivities,
  instructorStats,
  studentStats,
  sampleCourses,
  sampleAssignments,
  instructorActivities,
} from './data/dashboardData';


/* ─── PLACEHOLDER PAGE (non-dashboard menus) ─── */
function MenuPlaceholder({ activeMenu, setActiveMenu, currentRole }) {
  const roleSpecificButton = activeMenu === 'User Management' && currentRole === 'admin';

  return (
    <section className="management-placeholder">
      <div className="placeholder-icon">▦</div>
      <h1>{activeMenu}</h1>
      <p>Welcome to {activeMenu}. This section is ready for development.</p>

      {roleSpecificButton && (
        <button
          type="button"
          className="primary-action-button"
          onClick={() =>
            alert(
              'The Add User form will be developed next. User records will be connected to the database later.'
            )
          }
        >
          + Add New User
        </button>
      )}

      <button
        type="button"
        className="back-dashboard-button"
        onClick={() => setActiveMenu('Dashboard')}
      >
        ← Back to Dashboard
      </button>
    </section>
  );
}

function App() {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedInstructorCourseId, setSelectedInstructorCourseId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationError, setNotificationError] = useState('');


  const [authError, setAuthError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);

  const currentRole = role;
  const currentMenuItems = roleMenus[currentRole] || roleMenus.admin;
  const displayName = username.trim();

  const loadStudentNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/student/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Could not load notifications.');
      }

      const data = await response.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadNotificationCount(Number(data.unreadCount) || 0);
      setNotificationError('');
    } catch (error) {
      console.error('Notification loading failed:', error);
      setNotificationError('Unable to load notifications.');
    }
  };

  const markStudentNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/student/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Could not mark notification as read.');
      }

      await loadStudentNotifications();
    } catch (error) {
      console.error('Mark notification read failed:', error);
      setNotificationError('Unable to update this notification.');
    }
  };

// Check whether the user already has an active session.
useEffect(() => {
  let cancelled = false;

  const checkSession = async () => {
    try {
      const data = await authService.getCurrentUser();

      if (cancelled) return;

      if (data?.success && data?.user) {
        const actualRole = String(data.user.role || '').toLowerCase();

        if (['admin', 'instructor', 'student'].includes(actualRole)) {
          setUsername(data.user.username);
          setRole(actualRole);
          setActiveMenu('Dashboard');
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
        }
      } else {
        setLoggedIn(false);
      }
    } catch (error) {
      if (cancelled) return;

      console.info('No active login session.');
      setLoggedIn(false);
    } finally {
      if (!cancelled) {
        setSessionLoading(false);
      }
    }
  };

  checkSession();

  return () => {
    cancelled = true;
  };
}, []);

// Refresh notifications only while a student is logged in.
useEffect(() => {
  if (!loggedIn || currentRole !== 'student') {
    setNotifications([]);
    setUnreadNotificationCount(0);
    return undefined;
  }

  loadStudentNotifications();

  const notificationTimer = window.setInterval(() => {
    loadStudentNotifications();
  }, 10000);

  return () => {
    window.clearInterval(notificationTimer);
  };
}, [loggedIn, currentRole]);

const handleLogin = async (event) => {
  event.preventDefault();
  setAuthError('');

  const cleanUsername = username.trim();

  if (!cleanUsername || !password) {
    setAuthError('Please enter your username and password.');
    return;
  }

  try {
    setLoginLoading(true);
    const data = await authService.login(cleanUsername, password);

    if (!data?.success || !data?.user) {
      setAuthError(data?.message || 'Login failed. Please try again.');
      setLoggedIn(false);
      return;
    }

    const actualRole = String(data.user.role || '').toLowerCase();

    if (!['admin', 'instructor', 'student'].includes(actualRole)) {
      setAuthError('Invalid user role. Please contact the administrator.');
      setLoggedIn(false);
      return;
    }

    if (actualRole !== role) {
      setAuthError(`This account is registered as ${actualRole}. Choose that portal to continue.`);
      setLoggedIn(false);
      await authService.logout();
      return;
    }

    setUsername(data.user.username);
    setRole(actualRole);
    setActiveMenu('Dashboard');
    setPassword('');
    setAuthError('');
    setLoginOpen(false);
    setLoggedIn(true);
  } catch (error) {
    console.error('Login request failed:', error);

    setAuthError(
      error.message === 'Failed to fetch'
        ? 'Unable to connect to the server. Please check if the backend is running.'
        : error.message || 'Login failed. Please try again.'
    );
  } finally {
    setLoginLoading(false);
  }
};

const handleLogout = async () => {
  try {
    await authService.logout();

    setLoggedIn(false);
    setUsername('');
    setPassword('');
    setAuthError('');
    setActiveMenu('Dashboard');
    setLoginOpen(false);
  } catch (error) {
    console.error('Logout request failed:', error);
    setAuthError(error.message || 'Unable to log out.');
   }
};

  /* ─── SESSION LOADING ─── */
  if (sessionLoading) {
    return <div className="app-loading">Loading CSFJ LMS...</div>;
  }

  if (!loggedIn) {
    return (
      <main
        className="portal-page"
        style={{ '--portal-background': `url("${schoolBuilding}")` }}
      >
        <div className="portal-shade" />
        <section className="portal-content" aria-labelledby="portal-title">
          <img className="portal-logo" src={schoolLogo} alt="CSFJ" />
          <p className="portal-eyebrow">Colegio De San Francisco Javier</p>
          <h1 id="portal-title">Learning Management System</h1>
          <p className="portal-subtitle">Choose your workspace</p>

          <div className="portal-roles">
            {[
              { id: 'student', title: 'Student', description: 'Courses, assignments, and grades', icon: '↗' },
              { id: 'instructor', title: 'Instructor', description: 'Teaching, submissions, and classes', icon: '▤' },
              { id: 'admin', title: 'Administrator', description: 'People, courses, and academic operations', icon: '⌘' },
            ].map((portal) => (
              <button
                className="portal-role"
                key={portal.id}
                type="button"
                onClick={() => {
                  setRole(portal.id);
                  setAuthError('');
                  setPassword('');
                  setLoginOpen(true);
                }}
              >
                <span className="portal-role-icon" aria-hidden="true">{portal.icon}</span>
                <span className="portal-role-copy">
                  <strong>{portal.title}</strong>
                  <small>{portal.description}</small>
                </span>
                <span className="portal-role-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <footer className="portal-footer">Faith · Knowledge · Service</footer>
        </section>

        {loginOpen && (
          <div
            className="portal-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !loginLoading) {
                setLoginOpen(false);
                setAuthError('');
              }
            }}
          >
            <section
              className="portal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
            >
              <button
                className="portal-dialog-close"
                type="button"
                aria-label="Close sign in"
                disabled={loginLoading}
                onClick={() => {
                  setLoginOpen(false);
                  setAuthError('');
                }}
              >
                ×
              </button>
              <span className="portal-dialog-role">{role}</span>
              <h2 id="login-title">Sign in to your workspace</h2>
              <p>Use your CSFJ LMS account to continue.</p>

              <form className="portal-login-form" onSubmit={handleLogin}>
                {authError && <div className="login-error" role="alert">{authError}</div>}
                <label>
                  Username
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Password
                  <span className="portal-password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="portal-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
                <button className="portal-submit" type="submit" disabled={loginLoading}>
                  {loginLoading ? 'Signing in...' : 'Continue to dashboard'}
                  {!loginLoading && <span aria-hidden="true">→</span>}
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    );
  }

  /* ─── LOGGED-IN LAYOUT ─── */
  return (
    <div className={`admin-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src={schoolLogo} alt="CSFJ Logo" />
          {sidebarOpen && (
            <div className="sidebar-brand-text">
              <strong>CSFJ LMS</strong>
              <span>Colegio De San Francisco Javier</span>
            </div>
          )}
        </div>

        <nav className="sidebar-navigation">
          {currentMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sidebar-menu-item ${activeMenu === item.label ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.label)}
              title={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="sidebar-menu-item logout-menu"
          onClick={handleLogout}
          title="Logout"
        >
          <span className="menu-icon">↪</span>
          {sidebarOpen && <span>Logout</span>}
        </button>

        {sidebarOpen && (
          <div className="sidebar-bottom">
            <span className="sidebar-status-dot" />
            System Online
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <button
            className="icon-button menu-toggle"
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div className="admin-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search users, courses, or features..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="topbar-spacer" />

          <div className="notification-wrapper">
  <button
    type="button"
    className="icon-button notification-button"
    onClick={() => {
      const willOpen = !notificationsOpen;
      setNotificationsOpen(willOpen);

      if (willOpen && currentRole === 'student') {
        loadStudentNotifications();
      }
    }}
    aria-label="Notifications"
    aria-expanded={notificationsOpen}
  >
    ♧
    {currentRole === 'student' && unreadNotificationCount > 0 && (
      <span className="notification-count">
        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
      </span>
    )}
  </button>

  {notificationsOpen && (
    <div className="notification-popover">
      <div className="notification-popover-header">
        <strong>Notifications</strong>
        {currentRole === 'student' && unreadNotificationCount > 0 && (
          <span>{unreadNotificationCount} unread</span>
        )}
      </div>

      {currentRole !== 'student' ? (
        <p>Student upload notifications appear here for student accounts.</p>
      ) : notificationError ? (
        <p>{notificationError}</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              type="button"
              key={notification.id}
              className={`notification-item ${
                Number(notification.is_read) === 0 ? 'unread' : ''
              }`}
              onClick={async () => {
                if (Number(notification.is_read) === 0) {
                  await markStudentNotificationRead(notification.id);
                }

                if (notification.course_id) {
                  setSelectedCourseId(notification.course_id);
                  setActiveMenu('My Courses');
                }

                setNotificationsOpen(false);
              }}
            >
              <span className="notification-item-title">
                {notification.title}
              </span>

              <span className="notification-item-message">
                {notification.message}
              </span>

              <span className="notification-item-time">
                {notification.created_at
                  ? new Date(notification.created_at).toLocaleString()
                  : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )}
</div>

          <button
            type="button"
            className="admin-profile"
            onClick={() => setActiveMenu('Profile & Settings')}
          >
            <span className="profile-avatar">
  {(displayName.charAt(0) || 'U').toUpperCase()}
</span>
            <span className="profile-chevron">⌄</span>
          </button>
        </header>

        {/* Content Area */}
        {/* Content Area */}
<main className="admin-content">
  {activeMenu === 'Dashboard' ? (
    currentRole === 'admin' ? (
      <AdminDashboard
        setActiveMenu={setActiveMenu}
        initialActivities={initialActivities}
        schoolBuilding={schoolBuilding}
      />
    ) : currentRole === 'instructor' ? (
      <InstructorDashboard
        setActiveMenu={setActiveMenu}
        instructorStats={instructorStats}
        sampleCourses={sampleCourses}
        instructorActivities={instructorActivities}
        schoolBuilding={schoolBuilding}
      />
    ) : currentRole === 'student' ? (
      <StudentDashboard
        setActiveMenu={setActiveMenu}
        studentStats={studentStats}
        sampleCourses={sampleCourses}
        sampleAssignments={sampleAssignments}
        schoolBuilding={schoolBuilding}
      />
    ) : (
      <MenuPlaceholder
        activeMenu="Dashboard"
        setActiveMenu={setActiveMenu}
        currentRole={currentRole}
      />
    )
  ) : activeMenu === 'User Management' && currentRole === 'admin' ? (
    <UserManagement />
  ) : activeMenu === 'Student Management' && currentRole === 'admin' ? (
    <StudentManagement />
  ) : activeMenu === 'Instructor Management' && currentRole === 'admin' ? (
    <InstructorManagement />
  ) : activeMenu === 'Course Management' && currentRole === 'admin' ? (
    <CourseManagement />
  ) : activeMenu === 'Enrollment Management' && currentRole === 'admin' ? (
    <EnrollmentManagement />
  ) : activeMenu === 'Academic Management' && currentRole === 'admin' ? (
    <AcademicManagement />
  ) : activeMenu === 'Assignment Management' && currentRole === 'admin' ? (
    <AdminAssignmentManagement />
  ) : activeMenu === 'Quiz Management' && currentRole === 'admin' ? (
    <AdminQuizManagement />
  ) : activeMenu === 'Reports & Analytics' && currentRole === 'admin' ? (
    <AdminReportsAnalytics />
  ) : activeMenu === 'Profile & Settings' &&
    (currentRole === 'admin' || currentRole === 'instructor') ? (
    <ProfileSettings />
  ) : activeMenu === 'My Courses' && currentRole === 'student' ? (
    selectedCourseId ? (
      <CourseDetails
        courseId={selectedCourseId}
        onBack={() => setSelectedCourseId(null)}
      />
    ) : (
      <MyCourses
        onSelectCourse={(courseId) => setSelectedCourseId(courseId)}
      />
    )
  ) : activeMenu === 'Modules' && currentRole === 'student' ? (
    selectedCourseId ? (
      <CourseDetails
        courseId={selectedCourseId}
        onBack={() => setSelectedCourseId(null)}
      />
    ) : (
      <MyCourses
        onSelectCourse={(courseId) => setSelectedCourseId(courseId)}
      />
    )
  ) : (
    currentRole === 'student' &&
    [
      'Assignments',
      'My Submissions',
      'My Grades',
      'Profile & Settings',
    ].includes(activeMenu)
  ) ? (
    <StudentLearningPages
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
    />
  ) : activeMenu === 'Students List' && currentRole === 'instructor' ? (
    <StudentList />
  ) : activeMenu === 'Modules' && currentRole === 'instructor' ? (
    <Modules initialCourseId={selectedInstructorCourseId} />
  ) : activeMenu === 'Assignments' && currentRole === 'instructor' ? (
    <Assignments initialCourseId={selectedInstructorCourseId} />
  ) : activeMenu === 'Grades' && currentRole === 'instructor' ? (
    <Grades />
  ) : activeMenu === 'Submissions' && currentRole === 'instructor' ? (
    <Submissions />
  ) : activeMenu === 'My Courses' && currentRole === 'instructor' ? (
    <InstructorMyCourses
      onSelectCourse={(courseId, menu) => {
        setSelectedInstructorCourseId(String(courseId));
        setActiveMenu(menu);
      }}
    />
  ) : (
    <MenuPlaceholder
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      currentRole={currentRole}
    />
  )}

            <footer className="admin-footer">
            <span>© {new Date().getFullYear()} CSFJ LMS</span>
            <span>Colegio De San Francisco Javier</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
