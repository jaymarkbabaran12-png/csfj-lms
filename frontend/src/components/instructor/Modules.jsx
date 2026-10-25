import React, { useEffect, useState } from 'react';
import apiRequest from '../../services/api';
import './Modules.css';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getFileExtension(filename = '') {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) {
    return 'Unknown size';
  }

  const size = Number(bytes);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Modules() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [modules, setModules] = useState([]);
  const [materialsByModule, setMaterialsByModule] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingModuleId, setUploadingModuleId] = useState(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState(null);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    module_order: 1,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const response = await apiRequest('/instructor/courses');

        if (cancelled) return;

        const list = Array.isArray(response?.courses)
          ? response.courses
          : [];

        setCourses(list);

        if (list.length > 0) {
          setCourseId(String(list[0].id));
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

  async function loadMaterialsForModule(moduleId) {
    const response = await apiRequest(
      `/instructor/modules/${encodeURIComponent(moduleId)}/materials`
    );

    const materials = Array.isArray(response?.materials)
      ? response.materials
      : [];

    setMaterialsByModule((previous) => ({
      ...previous,
      [moduleId]: materials,
    }));

    return materials;
  }

  async function loadModules(id = courseId) {
    if (!id) {
      setModules([]);
      setMaterialsByModule({});
      return;
    }

    setLoadingModules(true);
    setError('');

    try {
      const response = await apiRequest(
        `/instructor/courses/${encodeURIComponent(id)}/modules`
      );

      const list = Array.isArray(response?.modules)
        ? response.modules
        : [];

      setModules(list);
      setMaterialsByModule({});

      // Load each module's files independently so one failed request
      // does not prevent the remaining modules from appearing.
      const materialResults = await Promise.allSettled(
        list.map(async (module) => {
          const result = await apiRequest(
            `/instructor/modules/${encodeURIComponent(module.id)}/materials`
          );

          return {
            moduleId: module.id,
            materials: Array.isArray(result?.materials)
              ? result.materials
              : [],
          };
        })
      );

      const nextMaterials = {};

      materialResults.forEach((result, index) => {
        const moduleId = list[index].id;

        if (result.status === 'fulfilled') {
          nextMaterials[moduleId] = result.value.materials;
        } else {
          nextMaterials[moduleId] = [];
        }
      });

      setMaterialsByModule(nextMaterials);
    } catch (err) {
      setError(err.message || 'Unable to load modules.');
      setModules([]);
      setMaterialsByModule({});
    } finally {
      setLoadingModules(false);
    }
  }

  useEffect(() => {
    if (courseId) {
      loadModules(courseId);
    } else {
      setModules([]);
      setMaterialsByModule({});
    }
    // loadModules is intentionally called when the selected course changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function resetForm() {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      module_order: modules.length + 1,
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEdit(module) {
    setEditingId(module.id);

    setForm({
      title: module.title || '',
      description: module.description || '',
      module_order: module.module_order || 1,
    });

    setMessage('');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!courseId) {
      setError('Please select a course.');
      return;
    }

    if (!form.title.trim()) {
      setError('Module title is required.');
      return;
    }

    const order = Number(form.module_order);

    if (!Number.isSafeInteger(order) || order < 1) {
      setError('Module order must be a positive integer.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        module_order: order,
      };

      if (editingId !== null) {
        await apiRequest(`/instructor/modules/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setMessage('Module updated successfully.');
      } else {
        await apiRequest(
          `/instructor/courses/${encodeURIComponent(courseId)}/modules`,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );

        setMessage('Module created successfully.');
      }

      resetForm();
      await loadModules(courseId);
    } catch (err) {
      setError(err.message || 'Unable to save module.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(module) {
    const confirmed = window.confirm(
      `Delete module "${module.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      await apiRequest(`/instructor/modules/${module.id}`, {
        method: 'DELETE',
      });

      setMessage('Module deleted successfully.');

      if (editingId === module.id) {
        resetForm();
      }

      await loadModules(courseId);
    } catch (err) {
      setError(err.message || 'Unable to delete module.');
    }
  }

  function handleFileSelection(moduleId, event) {
    const file = event.target.files?.[0] || null;

    setError('');
    setMessage('');

    if (!file) {
      setSelectedFiles((previous) => ({
        ...previous,
        [moduleId]: null,
      }));
      return;
    }

    const extension = getFileExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError('Allowed file types: PDF, DOC, DOCX, PPT, and PPTX.');
      event.target.value = '';

      setSelectedFiles((previous) => ({
        ...previous,
        [moduleId]: null,
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('The selected file exceeds the 20 MB limit.');
      event.target.value = '';

      setSelectedFiles((previous) => ({
        ...previous,
        [moduleId]: null,
      }));
      return;
    }

    setSelectedFiles((previous) => ({
      ...previous,
      [moduleId]: file,
    }));
  }

  async function handleUpload(module) {
    const file = selectedFiles[module.id];

    if (!file) {
      setError(`Choose a file to upload to "${module.title}".`);
      return;
    }

    const confirmed = window.confirm(
      `Upload "${file.name}" to module "${module.title}"?`
    );

    if (!confirmed) return;

    setUploadingModuleId(module.id);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();

      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('description', '');

      await apiRequest(
        `/instructor/modules/${encodeURIComponent(module.id)}/materials`,
        {
          method: 'POST',
          body: formData,
        }
      );

      setSelectedFiles((previous) => ({
        ...previous,
        [module.id]: null,
      }));

      setMessage(`"${file.name}" uploaded successfully.`);

      await loadMaterialsForModule(module.id);
    } catch (err) {
      setError(err.message || `Unable to upload "${file.name}".`);
    } finally {
      setUploadingModuleId(null);
    }
  }

  async function handleDeleteMaterial(material, module) {
    const confirmed = window.confirm(
      `Delete learning material "${material.title}"?`
    );

    if (!confirmed) return;

    setDeletingMaterialId(material.id);
    setError('');
    setMessage('');

    try {
      await apiRequest(`/instructor/materials/${material.id}`, {
        method: 'DELETE',
      });

      setMaterialsByModule((previous) => ({
        ...previous,
        [module.id]: (previous[module.id] || []).filter(
          (item) => item.id !== material.id
        ),
      }));

      setMessage(`"${material.title}" deleted successfully.`);
    } catch (err) {
      setError(err.message || 'Unable to delete learning material.');
    } finally {
      setDeletingMaterialId(null);
    }
  }

  if (loadingCourses) {
    return (
      <section className="modules-page">
        <p className="modules-notice">Loading assigned courses...</p>
      </section>
    );
  }

  return (
    <section className="modules-page">
      <header className="modules-header">
        <div>
          <span className="modules-eyebrow">INSTRUCTOR PORTAL</span>
          <h1>Modules Management</h1>
          <p>Organize the learning modules for your assigned courses.</p>
        </div>

        <div className="modules-count">
          <span>Total Modules</span>
          <strong>{modules.length}</strong>
        </div>
      </header>

      {error && (
        <div className="modules-alert modules-alert-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="modules-alert modules-alert-success" role="status">
          {message}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="modules-empty">
          <h2>No Assigned Courses</h2>
          <p>
            Wala ka pang assigned course. Contact your administrator para
            ma-assignan ka ng course.
          </p>
        </div>
      ) : (
        <>
          <div className="modules-course-selector">
            <label htmlFor="modules-course">Select Course</label>

            <select
              id="modules-course"
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                resetForm();
                setMessage('');
                setError('');
              }}
            >
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.course_code} — {course.course_name}
                </option>
              ))}
            </select>
          </div>

          <div className="modules-layout">
            <form className="modules-form" onSubmit={handleSubmit}>
              <h2>{editingId !== null ? 'Edit Module' : 'Create Module'}</h2>

              <div className="modules-field">
                <label htmlFor="module-title">Module Title *</label>
                <input
                  id="module-title"
                  name="title"
                  type="text"
                  maxLength={255}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Introduction to Programming"
                  required
                />
              </div>

              <div className="modules-field">
                <label htmlFor="module-description">Description</label>
                <textarea
                  id="module-description"
                  name="description"
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the learning module..."
                />
              </div>

              <div className="modules-field">
                <label htmlFor="module-order">Module Order *</label>
                <input
                  id="module-order"
                  name="module_order"
                  type="number"
                  min="1"
                  step="1"
                  value={form.module_order}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="modules-form-actions">
                <button
                  type="submit"
                  className="modules-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Save Changes'
                      : 'Create Module'}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    className="modules-secondary-button"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="modules-list-panel">
              <div className="modules-list-heading">
                <div>
                  <h2>Course Modules</h2>
                  <p>Manage modules and their learning materials.</p>
                </div>

                <button
                  type="button"
                  className="modules-refresh-button"
                  onClick={() => loadModules(courseId)}
                  disabled={loadingModules}
                >
                  {loadingModules ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {loadingModules ? (
                <p className="modules-notice">Loading modules...</p>
              ) : modules.length === 0 ? (
                <div className="modules-empty">
                  <h3>No Modules Yet</h3>
                  <p>Create the first module for this course using the form.</p>
                </div>
              ) : (
                <div className="modules-list">
                  {modules.map((module) => {
                    const materials = materialsByModule[module.id] || [];
                    const selectedFile = selectedFiles[module.id] || null;
                    const isUploading = uploadingModuleId === module.id;

                    return (
                      <article className="module-card" key={module.id}>
                        <div className="module-order">
                          {module.module_order}
                        </div>

                        <div className="module-card-content">
                          <h3>{module.title}</h3>

                          <p>
                            {module.description || 'No description provided.'}
                          </p>

                          <small>Module ID: {module.id}</small>

                          <section className="module-materials-upload">
                            <h4>Learning Materials</h4>

                            <p>
                              Upload PDF, Word, or PowerPoint files.
                              Maximum size: 20 MB per file.
                            </p>

                            <div className="module-upload-controls">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx"
                                aria-label={`Choose learning material for ${module.title}`}
                                onChange={(event) =>
                                  handleFileSelection(module.id, event)
                                }
                                disabled={isUploading}
                              />

                              <button
                                type="button"
                                onClick={() => handleUpload(module)}
                                disabled={!selectedFile || isUploading}
                              >
                                {isUploading ? 'Uploading...' : 'Upload File'}
                              </button>
                            </div>

                            {selectedFile && (
                              <small>
                                Selected: {selectedFile.name} (
                                {formatFileSize(selectedFile.size)})
                              </small>
                            )}

                            <div className="module-materials-list">
                              {materials.length === 0 ? (
                                <p>No uploaded files for this module yet.</p>
                              ) : (
                                <ul>
                                  {materials.map((material) => (
                                    <li key={material.id}>
                                      <div>
                                        <strong>{material.title}</strong>
                                        <small>
                                          {material.original_filename ||
                                            material.title}
                                          {' · '}
                                          {formatFileSize(material.file_size)}
                                        </small>
                                      </div>

                                      <button
                                        type="button"
                                        className="module-delete-button"
                                        onClick={() =>
                                          handleDeleteMaterial(material, module)
                                        }
                                        disabled={
                                          deletingMaterialId === material.id
                                        }
                                      >
                                        {deletingMaterialId === material.id
                                          ? 'Deleting...'
                                          : 'Delete File'}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </section>
                        </div>

                        <div className="module-card-actions">
                          <button
                            type="button"
                            onClick={() => handleEdit(module)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="module-delete-button"
                            onClick={() => handleDelete(module)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}