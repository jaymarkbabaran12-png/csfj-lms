import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import './AdminQuizManagement.css';

const EMPTY_STATS = {
  totalQuizzes: 0,
  coursesWithQuizzes: 0,
  totalPoints: 0,
  totalQuestions: 0,
};

const EMPTY_QUIZ = {
  course_id: '',
  module_id: '',
  title: '',
  description: '',
  total_points: 100,
};

const EMPTY_QUESTION = {
  question_text: '',
  points: 1,
  choices: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminQuizManagement() {
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [quizForm, setQuizForm] = useState(EMPTY_QUIZ);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const query = params.toString();

      const [quizResponse, statsResponse, optionsResponse] =
        await Promise.all([
          apiRequest(`/admin/quizzes${query ? `?${query}` : ''}`),
          apiRequest('/admin/quizzes/stats'),
          apiRequest('/admin/quiz-options'),
        ]);

      setQuizzes(
        Array.isArray(quizResponse?.quizzes)
          ? quizResponse.quizzes
          : []
      );

      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {}),
      });

      setCourses(
        Array.isArray(optionsResponse?.courses)
          ? optionsResponse.courses
          : []
      );

      setModules(
        Array.isArray(optionsResponse?.modules)
          ? optionsResponse.modules
          : []
      );
    } catch (err) {
      setError(
        err?.message ||
          'Hindi makuha ang quiz records. Suriin ang backend at database.'
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const openQuizDetails = async (quizId) => {
    setError('');
    setNotice('');

    try {
      const response = await apiRequest(`/admin/quizzes/${quizId}`);
      setSelectedQuiz(response.quiz);
      setQuestionForm({
        ...EMPTY_QUESTION,
        choices: EMPTY_QUESTION.choices.map((choice) => ({ ...choice })),
      });
    } catch (err) {
      setError(err?.message || 'Hindi mabuksan ang quiz details.');
    }
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!quizForm.course_id || !quizForm.title.trim()) {
      setError('Pumili ng course at maglagay ng quiz title.');
      return;
    }

    setSavingQuiz(true);

    try {
      const response = await apiRequest('/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          ...quizForm,
          course_id: Number(quizForm.course_id),
          module_id: quizForm.module_id
            ? Number(quizForm.module_id)
            : null,
          total_points: Number(quizForm.total_points),
        }),
      });

      setShowCreate(false);
      setQuizForm({ ...EMPTY_QUIZ });
      setNotice(response.message || 'Matagumpay na nagawa ang quiz.');

      await loadData();

      if (response.quiz?.id) {
        await openQuizDetails(response.quiz.id);
      }
    } catch (err) {
      setError(err?.message || 'Hindi nagawa ang quiz.');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleAddQuestion = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!selectedQuiz) return;

    if (!questionForm.question_text.trim()) {
      setError('Ilagay ang question text.');
      return;
    }

    if (questionForm.choices.some((choice) => !choice.text.trim())) {
      setError('Kumpletuhin ang lahat ng choices.');
      return;
    }

    if (
      questionForm.choices.filter((choice) => choice.is_correct).length !== 1
    ) {
      setError('Pumili ng eksaktong isang tamang sagot.');
      return;
    }

    setSavingQuestion(true);

    try {
      const response = await apiRequest(
        `/admin/quizzes/${selectedQuiz.id}/questions`,
        {
          method: 'POST',
          body: JSON.stringify({
            question_text: questionForm.question_text,
            points: Number(questionForm.points),
            choices: questionForm.choices,
          }),
        }
      );

      setNotice(response.message || 'Naidagdag ang question.');
      setQuestionForm({
        ...EMPTY_QUESTION,
        choices: EMPTY_QUESTION.choices.map((choice) => ({ ...choice })),
      });

      await openQuizDetails(selectedQuiz.id);
      await loadData();
    } catch (err) {
      setError(err?.message || 'Hindi naidagdag ang question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuiz = async (quiz) => {
    const confirmed = window.confirm(
      `Sigurado ka bang buburahin ang quiz "${quiz.title}"?`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      const response = await apiRequest(`/admin/quizzes/${quiz.id}`, {
        method: 'DELETE',
      });

      setSelectedQuiz(null);
      setNotice(response.message || 'Nabura ang quiz.');
      await loadData();
    } catch (err) {
      setError(
        err?.message ||
          'Hindi mabura ang quiz. Baka mayroon itong dependent records.'
      );
    }
  };

  const changeChoice = (index, key, value) => {
    setQuestionForm((previous) => ({
      ...previous,
      choices: previous.choices.map((choice, choiceIndex) => {
        if (key === 'is_correct') {
          return {
            ...choice,
            is_correct: choiceIndex === index,
          };
        }

        return choiceIndex === index
          ? { ...choice, [key]: value }
          : choice;
      }),
    }));
  };

  const availableModules = modules.filter(
    (module) => String(module.course_id) === String(quizForm.course_id)
  );

  return (
    <section className="admin-quiz-page">
      <div className="aq-heading">
        <div>
          <span className="aq-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Quiz Management</h1>
          <p>Create quizzes, organize questions, and manage answer choices.</p>
        </div>

        <div className="aq-heading-actions">
          <button
            type="button"
            className="aq-button aq-button-secondary"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="aq-button aq-button-primary"
            onClick={() => {
              setError('');
              setNotice('');
              setShowCreate((previous) => !previous);
              setSelectedQuiz(null);
            }}
          >
            + Create Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="aq-alert aq-alert-error" role="alert">
          <strong>May problema.</strong> {error}
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}

      {notice && (
        <div className="aq-alert aq-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')}>×</button>
        </div>
      )}

      <div className="aq-stats-grid">
        <article className="aq-stat-card">
          <span className="aq-stat-icon aq-blue">▤</span>
          <div><p>Total Quizzes</p><strong>{stats.totalQuizzes}</strong></div>
        </article>

        <article className="aq-stat-card">
          <span className="aq-stat-icon aq-gold">▦</span>
          <div><p>Courses With Quizzes</p><strong>{stats.coursesWithQuizzes}</strong></div>
        </article>

        <article className="aq-stat-card">
          <span className="aq-stat-icon aq-green">?</span>
          <div><p>Total Questions</p><strong>{stats.totalQuestions}</strong></div>
        </article>

        <article className="aq-stat-card">
          <span className="aq-stat-icon aq-purple">★</span>
          <div><p>Total Quiz Points</p><strong>{stats.totalPoints}</strong></div>
        </article>
      </div>

      {showCreate && (
        <form className="aq-panel aq-form" onSubmit={handleCreateQuiz}>
          <div className="aq-panel-heading">
            <div>
              <h2>Create New Quiz</h2>
              <p>Quiz details will be saved to the LMS database.</p>
            </div>
            <button
              type="button"
              className="aq-close-button"
              onClick={() => setShowCreate(false)}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <div className="aq-form-grid">
            <label>
              Course <span>*</span>
              <select
                value={quizForm.course_id}
                onChange={(event) =>
                  setQuizForm({
                    ...quizForm,
                    course_id: event.target.value,
                    module_id: '',
                  })
                }
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} — {course.course_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Module (optional)
              <select
                value={quizForm.module_id}
                onChange={(event) =>
                  setQuizForm({ ...quizForm, module_id: event.target.value })
                }
                disabled={!quizForm.course_id}
              >
                <option value="">No module selected</option>
                {availableModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="aq-full-width">
              Quiz Title <span>*</span>
              <input
                type="text"
                maxLength="255"
                value={quizForm.title}
                onChange={(event) =>
                  setQuizForm({ ...quizForm, title: event.target.value })
                }
                placeholder="e.g. Chapter 1 Quiz"
                required
              />
            </label>

            <label className="aq-full-width">
              Description
              <textarea
                rows="3"
                value={quizForm.description}
                onChange={(event) =>
                  setQuizForm({
                    ...quizForm,
                    description: event.target.value,
                  })
                }
                placeholder="Describe the quiz..."
              />
            </label>

            <label>
              Total Points
              <input
                type="number"
                min="0"
                value={quizForm.total_points}
                onChange={(event) =>
                  setQuizForm({
                    ...quizForm,
                    total_points: event.target.value,
                  })
                }
                required
              />
            </label>
          </div>

          <div className="aq-form-actions">
            <button
              type="button"
              className="aq-button aq-button-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="aq-button aq-button-primary"
              disabled={savingQuiz}
            >
              {savingQuiz ? 'Saving...' : 'Save Quiz'}
            </button>
          </div>
        </form>
      )}

      {selectedQuiz && (
        <div className="aq-panel aq-detail-panel">
          <div className="aq-panel-heading">
            <div>
              <span className="aq-eyebrow">QUIZ DETAILS</span>
              <h2>{selectedQuiz.title}</h2>
              <p>
                {selectedQuiz.course_code} — {selectedQuiz.course_name}
                {' · '}
                {selectedQuiz.total_points} points
              </p>
              {selectedQuiz.description && (
                <p>{selectedQuiz.description}</p>
              )}
            </div>

            <button
              type="button"
              className="aq-close-button"
              onClick={() => setSelectedQuiz(null)}
              aria-label="Close details"
            >
              ×
            </button>
          </div>

          <h3 className="aq-section-title">
            Questions ({selectedQuiz.questions?.length || 0})
          </h3>

          {selectedQuiz.questions?.length ? (
            <div className="aq-question-list">
              {selectedQuiz.questions.map((question, index) => (
                <article className="aq-question-card" key={question.id}>
                  <div className="aq-question-title">
                    <strong>{index + 1}. {question.question_text}</strong>
                    <span>{question.points} point(s)</span>
                  </div>

                  <div className="aq-choice-list">
                    {question.choices.map((choice) => (
                      <div
                        className={`aq-choice ${
                          choice.is_correct ? 'aq-choice-correct' : ''
                        }`}
                        key={choice.id}
                      >
                        <span>{choice.is_correct ? '✓' : '○'}</span>
                        {choice.choice_text}
                        {choice.is_correct && (
                          <small>Correct answer</small>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="aq-empty-inline">
              Wala pang questions ang quiz na ito.
            </p>
          )}

          <form className="aq-question-form" onSubmit={handleAddQuestion}>
            <h3>Add Multiple-Choice Question</h3>

            <label>
              Question <span>*</span>
              <textarea
                rows="3"
                value={questionForm.question_text}
                onChange={(event) =>
                  setQuestionForm({
                    ...questionForm,
                    question_text: event.target.value,
                  })
                }
                placeholder="Enter your question..."
                required
              />
            </label>

            <label className="aq-points-field">
              Points
              <input
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(event) =>
                  setQuestionForm({
                    ...questionForm,
                    points: event.target.value,
                  })
                }
                required
              />
            </label>

            <p className="aq-helper-text">
              Ilagay ang apat na choices at piliin ang radio button ng tamang sagot.
            </p>

            <div className="aq-choices-editor">
              {questionForm.choices.map((choice, index) => (
                <label className="aq-choice-input" key={index}>
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={choice.is_correct}
                    onChange={() => changeChoice(index, 'is_correct', true)}
                    aria-label={`Mark choice ${index + 1} as correct`}
                  />

                  <span>{String.fromCharCode(65 + index)}.</span>

                  <input
                    type="text"
                    value={choice.text}
                    onChange={(event) =>
                      changeChoice(index, 'text', event.target.value)
                    }
                    placeholder={`Choice ${index + 1}`}
                    required
                  />

                  {choice.is_correct && <small>Correct</small>}
                </label>
              ))}
            </div>

            <div className="aq-form-actions">
              <button
                type="submit"
                className="aq-button aq-button-primary"
                disabled={savingQuestion}
              >
                {savingQuestion ? 'Saving...' : '+ Add Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="aq-panel">
        <div className="aq-panel-heading">
          <div>
            <h2>All Quizzes</h2>
            <p>Quiz records from the CSFJ LMS database.</p>
          </div>
          <span className="aq-record-count">
            {quizzes.length} record{quizzes.length === 1 ? '' : 's'}
          </span>
        </div>

        <label className="aq-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search quiz title or course..."
            aria-label="Search quizzes"
          />
        </label>

        <div className="aq-table-scroll">
          <table className="aq-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Course</th>
                <th>Module</th>
                <th>Questions</th>
                <th>Total Points</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="aq-empty-state">
                    Loading quizzes...
                  </td>
                </tr>
              ) : error && quizzes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="aq-empty-state">
                    Hindi ma-load ang quiz records.
                  </td>
                </tr>
              ) : quizzes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="aq-empty-state">
                    <span className="aq-empty-icon">▤</span>
                    <strong>No quizzes found</strong>
                    <p>Gumawa ng quiz o subukan ang ibang search.</p>
                  </td>
                </tr>
              ) : (
                quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>
                      <div className="aq-quiz-name">{quiz.title}</div>
                      <div className="aq-quiz-description">
                        {quiz.description || 'No description'}
                      </div>
                    </td>

                    <td>
                      <strong>{quiz.course_code}</strong>
                      <div className="aq-muted">{quiz.course_name}</div>
                    </td>

                    <td>{quiz.module_title || '—'}</td>
                    <td>{quiz.question_count}</td>
                    <td>{quiz.total_points}</td>
                    <td>{formatDate(quiz.created_at)}</td>

                    <td>
                      <div className="aq-row-actions">
                        <button
                          type="button"
                          className="aq-action-view"
                          onClick={() => openQuizDetails(quiz.id)}
                        >
                          View / Edit
                        </button>

                        <button
                          type="button"
                          className="aq-action-delete"
                          onClick={() => handleDeleteQuiz(quiz)}
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
    </section>
  );
}
