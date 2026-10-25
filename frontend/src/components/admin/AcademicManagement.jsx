import React, { useCallback, useEffect, useMemo, useState } from "react";
import apiRequest from "../../services/api";
import "./AcademicManagement.css";

const EMPTY_FORM = {
  program_id: "",
  subject_code: "",
  subject_name: "",
  description: "",
  year_level: "1",
  semester: "1",
  subject_type: "",
  units: "3",
};

const SUBJECT_TYPES = ["Major", "Minor"];

export default function AcademicManagement() {
  const [programs, setPrograms] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    setError("");

    try {
      const result = await apiRequest("/admin/academic/programs");

      if (!result?.success || !Array.isArray(result.programs)) {
        throw new Error("Invalid academic programs response.");
      }

      setPrograms(result.programs);

      setSelectedProgram((current) => {
        if (
          current &&
          result.programs.some(
            (program) => String(program.id) === current
          )
        ) {
          return current;
        }

        return result.programs.length
          ? String(result.programs[0].id)
          : "";
      });
    } catch (err) {
      setError(err.message || "Failed to load academic programs.");
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    if (!selectedProgram) {
      setSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    setError("");

    try {
      const query = new URLSearchParams();

      if (yearFilter) {
        query.set("year_level", yearFilter);
      }

      if (semesterFilter) {
        query.set("semester", semesterFilter);
      }

      const suffix = query.toString()
        ? `?${query.toString()}`
        : "";

      const result = await apiRequest(
        `/academic/programs/${selectedProgram}/subjects${suffix}`
      );

      if (!result?.success || !Array.isArray(result.subjects)) {
        throw new Error("Invalid curriculum subjects response.");
      }

      setSubjects(result.subjects);
    } catch (err) {
      setSubjects([]);
      setError(err.message || "Failed to load curriculum subjects.");
    } finally {
      setLoadingSubjects(false);
    }
  }, [selectedProgram, yearFilter, semesterFilter]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Apply the subject type filter locally.
  // Existing subjects with NULL subject_type remain unclassified.
  const filteredSubjects = useMemo(() => {
    if (!subjectTypeFilter) {
      return subjects;
    }

    if (subjectTypeFilter === "Unclassified") {
      return subjects.filter(
        (subject) => !subject.subject_type
      );
    }

    return subjects.filter(
      (subject) => subject.subject_type === subjectTypeFilter
    );
  }, [subjects, subjectTypeFilter]);

  const selectedProgramInfo = programs.find(
    (program) => String(program.id) === selectedProgram
  );

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      program_id: selectedProgram,
      year_level: yearFilter || "1",
      semester: semesterFilter || "1",
      subject_type: "",
    });

    setShowForm(true);
    setNotice("");
    setError("");
  }

  function openEditForm(subject) {
    setEditingId(subject.id);

    setForm({
      program_id: String(subject.program_id),
      subject_code: subject.subject_code || "",
      subject_name: subject.subject_name || "",
      description: subject.description || "",
      year_level: String(subject.year_level),
      semester: String(subject.semester),
      subject_type: subject.subject_type || "",
      units: String(subject.units ?? "3"),
    });

    setShowForm(true);
    setNotice("");
    setError("");
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      program_id: Number(form.program_id),
      year_level: Number(form.year_level),
      semester: Number(form.semester),
      units: Number(form.units),
    };

    try {
      const endpoint = editingId
        ? `/admin/academic/subjects/${editingId}`
        : "/admin/academic/subjects";

      const result = await apiRequest(endpoint, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setNotice(
        result.message ||
          (editingId
            ? "Subject updated successfully."
            : "Subject added successfully.")
      );

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      if (String(payload.program_id) !== selectedProgram) {
        setSelectedProgram(String(payload.program_id));
      } else {
        await loadSubjects();
      }

      await loadPrograms();
    } catch (err) {
      setError(err.message || "Unable to save the subject.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject) {
    const confirmed = window.confirm(
      `Delete ${subject.subject_code} - ${subject.subject_name}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `/admin/academic/subjects/${subject.id}`,
        { method: "DELETE" }
      );

      setNotice(result.message || "Subject deleted successfully.");

      await loadSubjects();
      await loadPrograms();
    } catch (err) {
      setError(err.message || "Unable to delete the subject.");
    }
  }

  function getSubjectTypeLabel(subjectType) {
    return subjectType || "Unclassified";
  }

  return (
    <section className="academic-page">
      <header className="academic-heading">
        <div>
          <span className="academic-eyebrow">
            ADMINISTRATION
          </span>

          <h1>Academic Management</h1>

          <p>
            Manage academic programs and their curriculum subjects.
          </p>
        </div>

        <button
          type="button"
          className="academic-primary-button"
          onClick={openAddForm}
          disabled={!selectedProgram || loadingPrograms}
        >
          + Add Subject
        </button>
      </header>

      {error && (
        <div
          className="academic-alert academic-alert-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="academic-alert academic-alert-success"
          role="status"
        >
          {notice}
        </div>
      )}

      <div className="academic-summary-grid">
        <article className="academic-summary-card">
          <span>Academic Programs</span>
          <strong>
            {loadingPrograms ? "…" : programs.length}
          </strong>
        </article>

        <article className="academic-summary-card">
          <span>Subjects in View</span>
          <strong>
            {loadingSubjects ? "…" : filteredSubjects.length}
          </strong>
        </article>

        <article className="academic-summary-card">
          <span>Selected Program</span>
          <strong className="academic-program-code">
            {selectedProgramInfo?.program_code || "—"}
          </strong>
        </article>
      </div>

      <div className="academic-panel">
        <div className="academic-panel-heading">
          <div>
            <h2>Curriculum Subjects</h2>

            <p>
              Select a program and filter subjects by year,
              semester, and subject type.
            </p>
          </div>
        </div>

        <div className="academic-filters">
          <label>
            Academic Program

            <select
              value={selectedProgram}
              onChange={(event) =>
                setSelectedProgram(event.target.value)
              }
              disabled={loadingPrograms}
            >
              {programs.length === 0 && (
                <option value="">
                  No programs available
                </option>
              )}

              {programs.map((program) => (
                <option
                  key={program.id}
                  value={String(program.id)}
                >
                  {program.program_code} — {program.program_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Year Level

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
            >
              <option value="">All year levels</option>

              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={String(year)}>
                  Year {year}
                </option>
              ))}
            </select>
          </label>

          <label>
            Semester

            <select
              value={semesterFilter}
              onChange={(event) =>
                setSemesterFilter(event.target.value)
              }
            >
              <option value="">All semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
            </select>
          </label>

          <label>
            Subject Type

            <select
              value={subjectTypeFilter}
              onChange={(event) =>
                setSubjectTypeFilter(event.target.value)
              }
            >
              <option value="">All subject types</option>
              <option value="Major">Major</option>
              <option value="Minor">Minor</option>
              <option value="Unclassified">Unclassified</option>
            </select>
          </label>
        </div>

        <div className="academic-table-wrapper">
          <table className="academic-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Year</th>
                <th>Semester</th>
                <th>Subject Type</th>
                <th>Units</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loadingSubjects ? (
                <tr>
                  <td colSpan="7" className="academic-empty">
                    Loading curriculum subjects…
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="academic-empty">
                    <strong>
                      No curriculum subjects found.
                    </strong>

                    <span>
                      Try changing your filters or selecting
                      another academic program.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject.id}>
                    <td>
                      <span className="academic-subject-code">
                        {subject.subject_code}
                      </span>
                    </td>

                    <td>
                      <div className="academic-subject-name">
                        {subject.subject_name}
                      </div>

                      {subject.description && (
                        <div className="academic-subject-description">
                          {subject.description}
                        </div>
                      )}
                    </td>

                    <td>Year {subject.year_level}</td>

                    <td>
                      {Number(subject.semester) === 1
                        ? "1st"
                        : "2nd"}{" "}
                      Semester
                    </td>

                    <td>
                      <span
                        className={`academic-type-badge ${
                          subject.subject_type
                            ? `academic-type-${subject.subject_type.toLowerCase()}`
                            : "academic-type-unclassified"
                        }`}
                      >
                        {getSubjectTypeLabel(subject.subject_type)}
                      </span>
                    </td>

                    <td>{subject.units}</td>

                    <td>
                      <div className="academic-row-actions">
                        <button
                          type="button"
                          className="academic-edit-button"
                          onClick={() => openEditForm(subject)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="academic-delete-button"
                          onClick={() => handleDelete(subject)}
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
      </div>

      {showForm && (
        <div className="academic-modal-backdrop">
          <section
            className="academic-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-form-title"
          >
            <div className="academic-modal-heading">
              <div>
                <span className="academic-eyebrow">
                  CURRICULUM MANAGEMENT
                </span>

                <h2 id="academic-form-title">
                  {editingId ? "Edit Subject" : "Add Subject"}
                </h2>
              </div>

              <button
                type="button"
                className="academic-close-button"
                onClick={closeForm}
                aria-label="Close form"
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="academic-form-grid">
                <label className="academic-field-full">
                  Academic Program *

                  <select
                    name="program_id"
                    value={form.program_id}
                    onChange={updateField}
                    required
                  >
                    <option value="">Select program</option>

                    {programs.map((program) => (
                      <option
                        key={program.id}
                        value={String(program.id)}
                      >
                        {program.program_code} — {program.program_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Subject Code *

                  <input
                    name="subject_code"
                    value={form.subject_code}
                    onChange={updateField}
                    maxLength="50"
                    required
                  />
                </label>

                <label>
                  Subject Name *

                  <input
                    name="subject_name"
                    value={form.subject_name}
                    onChange={updateField}
                    maxLength="255"
                    required
                  />
                </label>

                <label>
                  Year Level *

                  <select
                    name="year_level"
                    value={form.year_level}
                    onChange={updateField}
                    required
                  >
                    {[1, 2, 3, 4].map((year) => (
                      <option
                        key={year}
                        value={String(year)}
                      >
                        Year {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Semester *

                  <select
                    name="semester"
                    value={form.semester}
                    onChange={updateField}
                    required
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </label>

                <label>
                  Subject Type *

                  <select
                    name="subject_type"
                    value={form.subject_type}
                    onChange={updateField}
                    required
                  >
                    <option value="">
                      Select subject type
                    </option>

                    {SUBJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Units *

                  <input
                    type="number"
                    name="units"
                    min="0.5"
                    max="30"
                    step="0.5"
                    value={form.units}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="academic-field-full">
                  Description

                  <textarea
                    name="description"
                    rows="3"
                    value={form.description}
                    onChange={updateField}
                    maxLength="2000"
                  />
                </label>
              </div>

              <div className="academic-form-actions">
                <button
                  type="button"
                  className="academic-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="academic-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save Changes"
                      : "Add Subject"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}