import React, { useEffect, useState } from 'react';
import apiRequest, { API_BASE_URL } from '../../services/api';
import './CourseDetails.css';

function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size < 0) {
    return '';
  }

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getMaterialDownloadUrl(material) {
  if (!material?.id || !material?.is_file) {
    return null;
  }

  return `${API_BASE_URL}/student/materials/${encodeURIComponent(
    material.id
  )}/download`;
}

export default function CourseDetails({ courseId, onBack }) {
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadCourseDetails() {
      setLoading(true);
      setError('');

      try {
        const [courseResponse, modulesResponse] = await Promise.all([
          apiRequest(`/student/courses/${encodeURIComponent(courseId)}`),
          apiRequest(
            `/student/courses/${encodeURIComponent(courseId)}/modules`
          ),
        ]);

        if (!cancelled) {
          setCourse(courseResponse.course);
          setModules(
            Array.isArray(modulesResponse.modules)
              ? modulesResponse.modules
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load course details.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (courseId) {
      loadCourseDetails();
    } else {
      setCourse(null);
      setModules([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <section className="course-details-page">
        <button className="course-details-back" onClick={onBack}>
          ← Back to My Courses
        </button>

        <div className="course-details-message">
          <div className="course-details-spinner" />
          <h2>Loading course details...</h2>
          <p>Please wait while we retrieve the course information.</p>
        </div>
      </section>
    );
  }

  if (error || !course) {
    return (
      <section className="course-details-page">
        <button className="course-details-back" onClick={onBack}>
          ← Back to My Courses
        </button>

        <div className="course-details-message course-details-error">
          <h2>Unable to open course</h2>
          <p>{error || 'Course information is unavailable.'}</p>

          <button className="course-details-primary" onClick={onBack}>
            Return to My Courses
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="course-details-page">
      <button className="course-details-back" onClick={onBack}>
        ← Back to My Courses
      </button>

      <header className="course-details-header">
        <div className="course-details-icon">▣</div>

        <div className="course-details-heading">
          <span className="course-details-eyebrow">MY LEARNING SPACE</span>

          <h1>{course.course_name}</h1>

          <p>
            {course.course_code}
            <span className="course-details-separator">•</span>
            {course.instructor_name || 'Instructor not assigned'}
          </p>
        </div>

        <span className="course-details-status">Active Enrollment</span>
      </header>

      <div className="course-details-content">
        <article className="course-details-panel">
          <div className="course-details-panel-heading">
            <div>
              <span className="course-details-eyebrow">COURSE OVERVIEW</span>
              <h2>About This Course</h2>
            </div>
          </div>

          <p className="course-details-description">
            {course.description ||
              'No course description has been provided yet.'}
          </p>

          <div className="course-details-information">
            <div>
              <span>Course Code</span>
              <strong>{course.course_code}</strong>
            </div>

            <div>
              <span>Instructor</span>
              <strong>{course.instructor_name || 'Not assigned'}</strong>
            </div>

            <div>
              <span>Enrollment Status</span>
              <strong className="course-details-active-text">
                {course.enrollment_status || 'active'}
              </strong>
            </div>
          </div>
        </article>

        <article className="course-details-panel">
          <div className="course-details-panel-heading">
            <div>
              <span className="course-details-eyebrow">COURSE CONTENT</span>
              <h2>Modules and Learning Materials</h2>
              <p>Explore the learning modules provided for this course.</p>
            </div>

            <div className="course-details-module-count">
              <strong>{modules.length}</strong>
              <span>Modules</span>
            </div>
          </div>

          {modules.length === 0 ? (
            <div className="course-details-empty">
              <div className="course-details-empty-icon">▤</div>
              <h3>No modules available yet</h3>
              <p>
                Your instructor has not added any modules to this course.
                Please check again later.
              </p>
            </div>
          ) : (
            <div className="course-details-module-list">
              {modules.map((module, index) => {
                const materials = Array.isArray(module.materials)
                  ? module.materials
                  : [];

                return (
                  <article
                    className="course-details-module"
                    key={module.id}
                  >
                    <div className="course-details-module-number">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="course-details-module-body">
                      <h3>{module.title}</h3>

                      <p>
                        {module.description ||
                          'No module description provided.'}
                      </p>

                      <div className="course-details-materials">
                        <strong>
                          Learning Materials ({materials.length})
                        </strong>

                        {materials.length > 0 ? (
                          <ul>
                            {materials.map((material) => {
                              const downloadUrl =
                                getMaterialDownloadUrl(material);

                              return (
                                <li key={material.id}>
                                  <span className="course-details-material-icon">
                                    {material.is_file
                                      ? '📄'
                                      : material.material_type === 'video'
                                        ? '▶'
                                        : material.material_type === 'link'
                                          ? '↗'
                                          : material.material_type === 'text'
                                            ? '▤'
                                            : '▧'}
                                  </span>

                                  <div className="course-details-material-info">
                                    <strong>{material.title}</strong>

                                    <span>
                                      {material.original_filename ||
                                        material.material_type}
                                      {material.file_size != null
                                        ? ` · ${formatFileSize(
                                            material.file_size
                                          )}`
                                        : ''}
                                    </span>

                                    {material.description && (
                                      <p>{material.description}</p>
                                    )}
                                  </div>

                                  {downloadUrl ? (
                                    <a
                                      className="course-details-material-link"
                                      href={downloadUrl}
                                    >
                                      Download ↓
                                    </a>
                                  ) : material.material_url ? (
                                    <a
                                      className="course-details-material-link"
                                      href={material.material_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open ↗
                                    </a>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="course-details-no-materials">
                            No learning materials have been added.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}