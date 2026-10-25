import React, { useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './StudentList.css';

export default function StudentList() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoadingCourses(true);
      setError('');

      try {
        const response = await apiRequest('/instructor/courses');

        if (cancelled) return;

        const assignedCourses = Array.isArray(response?.courses)
          ? response.courses
          : [];

        setCourses(assignedCourses);

        if (assignedCourses.length > 0) {
          setSelectedCourseId(String(assignedCourses[0].id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load assigned courses.');
        }
      } finally {
        if (!cancelled) {
          setLoadingCourses(false);
        }
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setStudents([]);
      setSelectedCourse(null);
      return;
    }

    let cancelled = false;

    async function loadStudents() {
      setLoadingStudents(true);
      setError('');
      setStudents([]);

      try {
        const response = await apiRequest(
          `/instructor/courses/${encodeURIComponent(selectedCourseId)}/students`
        );

        if (cancelled) return;

        setStudents(Array.isArray(response?.students) ? response.students : []);
        setSelectedCourse(response?.course || null);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load students for this course.');
          setStudents([]);
          setSelectedCourse(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredStudents = students.filter((student) => {
    const searchableValues = [
      student.student_id,
      student.full_name,
      student.username,
      student.email,
      student.enrollment_status,
    ];

    return searchableValues.some((value) =>
      String(value || '').toLowerCase().includes(normalizedSearch)
    );
  });

  if (loadingCourses) {
    return (
      <section className="student-list-page">
        <p className="student-list-message">Loading assigned courses...</p>
      </section>
    );
  }

  return (
    <section className="student-list-page">
      <header className="student-list-header">
        <div>
          <p className="student-list-eyebrow">INSTRUCTOR PORTAL</p>
          <h1>Student List</h1>
          <p>
            View students enrolled in the courses assigned to your account.
          </p>
        </div>

        <div className="student-list-total">
          <span>Total Students</span>
          <strong>{students.length}</strong>
        </div>
      </header>

      {courses.length === 0 ? (
        <div className="student-list-message">
          <h2>No Assigned Courses</h2>
          <p>
            Wala ka pang assigned course. Contact your administrator para
            ma-assignan ka ng course.
          </p>
        </div>
      ) : (
        <>
          <div className="student-list-toolbar">
            <label htmlFor="student-list-course">Select Course</label>

            <select
              id="student-list-course"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.course_code} — {course.course_name}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student..."
              aria-label="Search students"
            />
          </div>

          {selectedCourse && (
            <div className="student-list-course-info">
              <div>
                <span>Selected Course</span>
                <strong>
                  {selectedCourse.course_code} — {selectedCourse.course_name}
                </strong>
              </div>
              <div>
                <span>Students in this course</span>
                <strong>{students.length}</strong>
              </div>
            </div>
          )}

          {error && (
            <div className="student-list-error" role="alert">
              {error}
            </div>
          )}

          {loadingStudents ? (
            <p className="student-list-message">Loading students...</p>
          ) : (
            <div className="student-list-table-wrapper">
              <table className="student-list-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Enrollment Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="student-list-empty">
                        {students.length === 0
                          ? 'No students are enrolled in this course yet.'
                          : 'No students matched your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.student_id || '—'}</td>
                        <td>{student.full_name || 'Name not provided'}</td>
                        <td>{student.username || '—'}</td>
                        <td>{student.email || '—'}</td>
                        <td>
                          <span
                            className={`enrollment-status ${
                              String(student.enrollment_status || '')
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                            }`}
                          >
                            {student.enrollment_status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
