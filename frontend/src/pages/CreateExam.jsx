import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  FileText,
  Zap,
  Upload,
  X,
  Edit3,
  Sparkles,
} from "lucide-react";

const emptyQuestion = (num = 1) => ({
  questionNumber: num,
  questionText: "",
  maxMarks: 5,
  modelAnswer: "",
});

export default function CreateExam() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=details, 2=questions
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [exam, setExam] = useState({ title: "", subject: "", totalMarks: "" });
  const [questions, setQuestions] = useState([emptyQuestion(1)]);
  const [questionMode, setQuestionMode] = useState("manual"); // 'manual' | 'upload'
  const [paperFile, setPaperFile] = useState(null);

  const handleExam = (e) =>
    setExam({ ...exam, [e.target.name]: e.target.value });

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion(questions.length + 1)]);
  };

  const removeQuestion = (idx) => {
    const updated = questions
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, questionNumber: i + 1 }));
    setQuestions(updated);
  };

  const handleQ = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = field === "maxMarks" ? Number(value) : value;
    setQuestions(updated);
  };

  const submitStep1 = (e) => {
    e.preventDefault();
    if (!exam.title || !exam.subject || !exam.totalMarks)
      return toast.error("Fill all fields");
    setStep(2);
  };

  // ── Paper dropzone ──
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setPaperFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024,
  });

  // ── Extract questions from paper ──
  const handleExtractQuestions = async () => {
    if (!paperFile) return toast.error("Please upload a question paper first");
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("questionPaper", paperFile);
      const { data } = await api.post("/exams/parse-question-paper", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data.questions || data.questions.length === 0) {
        return toast.error(
          "No questions could be extracted. Try a clearer image or PDF.",
        );
      }
      setQuestions(
        data.questions.map((q, i) => ({
          questionNumber: i + 1,
          questionText: q.questionText || "",
          maxMarks: Number(q.maxMarks) || 5,
          modelAnswer: q.modelAnswer || "",
        })),
      );
      // Auto-set total marks
      const total = data.questions.reduce(
        (s, q) => s + (Number(q.maxMarks) || 5),
        0,
      );
      setExam((prev) => ({ ...prev, totalMarks: total.toString() }));
      toast.success(
        `✨ Extracted ${data.questions.length} questions! Review and edit below.`,
      );
      setQuestionMode("manual"); // Switch to manual view to review
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Extraction failed. Please try again.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const submitFinal = async (e) => {
    e.preventDefault();
    const invalid = questions.find(
      (q) => !q.questionText || !q.modelAnswer || !q.maxMarks,
    );
    if (invalid) return toast.error("Fill all question fields");
    setLoading(true);
    try {
      const { data } = await api.post("/exams", {
        ...exam,
        totalMarks: Number(exam.totalMarks),
        questions,
      });
      toast.success("Exam created!");
      navigate(`/exams/${data._id}/upload`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  const totalQMarks = questions.reduce(
    (s, q) => s + Number(q.maxMarks || 0),
    0,
  );
  const marksMatch = totalQMarks === Number(exam.totalMarks);

  return (
    <div className="page-container fade-in" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Create New Exam</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Set up exam details, then add questions manually or extract from a
          question paper
        </p>
      </div>

      {/* Steps indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 32,
        }}
      >
        {[
          { n: 1, label: "Exam Details" },
          { n: 2, label: "Questions" },
        ].map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: step >= s.n ? "var(--accent)" : "var(--bg-card2)",
                  border: `2px solid ${step >= s.n ? "var(--accent)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: step >= s.n ? "white" : "var(--text-dim)",
                  transition: "all 0.3s",
                }}
              >
                {step > s.n ? <CheckCircle size={16} /> : s.n}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: step >= s.n ? "var(--text)" : "var(--text-dim)",
                }}
              >
                {s.label}
              </span>
            </div>
            {i === 0 && (
              <div
                style={{
                  width: 60,
                  height: 2,
                  background: step > 1 ? "var(--accent)" : "var(--border)",
                  margin: "0 12px",
                  transition: "all 0.3s",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="card fade-in">
          <form onSubmit={submitStep1}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Exam Title</label>
                <input
                  className="form-input"
                  name="title"
                  placeholder="Mid-Term Physics"
                  value={exam.title}
                  onChange={handleExam}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Subject</label>
                <input
                  className="form-input"
                  name="subject"
                  placeholder="Physics"
                  value={exam.subject}
                  onChange={handleExam}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total Marks</label>
              <input
                className="form-input"
                name="totalMarks"
                type="number"
                placeholder="50"
                value={exam.totalMarks}
                onChange={handleExam}
                required
                min={1}
                style={{ maxWidth: 200 }}
              />
              <span
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}
              >
                Can be auto-updated when you extract questions from a paper
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              Next: Add Questions <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="fade-in">
          {/* Mode selector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={() => setQuestionMode("upload")}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                border: `2px solid ${questionMode === "upload" ? "var(--accent)" : "var(--border)"}`,
                background:
                  questionMode === "upload"
                    ? "var(--accent-glow)"
                    : "var(--bg-card)",
                color:
                  questionMode === "upload" ? "var(--accent)" : "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <Sparkles size={18} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Upload Question Paper
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: "var(--accent)",
                    color: "white",
                    fontWeight: 700,
                  }}
                >
                  AI
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Upload a PDF or image of your question paper. Gemini will
                extract all questions, marks, and generate model answers
                automatically.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setQuestionMode("manual")}
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                border: `2px solid ${questionMode === "manual" ? "var(--accent)" : "var(--border)"}`,
                background:
                  questionMode === "manual"
                    ? "var(--accent-glow)"
                    : "var(--bg-card)",
                color:
                  questionMode === "manual" ? "var(--accent)" : "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <Edit3 size={18} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Enter Manually
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Type questions one by one with custom marks and model answers.
              </p>
            </button>
          </div>

          {/* Upload Mode */}
          {questionMode === "upload" && (
            <div className="card fade-in" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                <FileText
                  size={16}
                  style={{ verticalAlign: "middle", marginRight: 6 }}
                />
                Upload Question Paper
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}
              >
                Gemini Vision will scan your paper and extract all questions,
                marks, and generate model answers.
              </p>

              <div
                {...getRootProps()}
                style={{
                  border: `2px dashed ${isDragActive ? "var(--accent)" : paperFile ? "var(--success)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "36px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragActive
                    ? "var(--accent-glow)"
                    : paperFile
                      ? "rgba(6,214,160,0.05)"
                      : "var(--bg-card2)",
                  transition: "all 0.2s",
                  marginBottom: 16,
                }}
              >
                <input {...getInputProps()} />
                {paperFile ? (
                  <div>
                    <FileText
                      size={36}
                      style={{ color: "var(--success)", margin: "0 auto 12px" }}
                    />
                    <p style={{ fontWeight: 600, color: "var(--success)" }}>
                      {paperFile.name}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {(paperFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaperFile(null);
                      }}
                      style={{
                        marginTop: 10,
                        background: "none",
                        border: "none",
                        color: "var(--red)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                      }}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload
                      size={36}
                      style={{
                        color: "var(--text-dim)",
                        margin: "0 auto 12px",
                      }}
                    />
                    <p style={{ fontWeight: 600 }}>
                      {isDragActive
                        ? "Drop it here!"
                        : "Drag & drop question paper"}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      PDF or image (JPG, PNG) · Max 15MB
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        marginTop: 8,
                      }}
                    >
                      Or click to browse
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleExtractQuestions}
                className="btn btn-primary"
                disabled={!paperFile || extracting}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {extracting ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: 16, height: 16 }}
                    />{" "}
                    Extracting with AI...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Extract Questions with Gemini
                  </>
                )}
              </button>

              {questions.length > 0 && questions[0].questionText && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "rgba(6,214,160,0.08)",
                    border: "1px solid var(--success)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--success)",
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    ✓ {questions.length} questions extracted. Switch to "Enter
                    Manually" to review and edit them.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode - always show question list */}
          <form onSubmit={submitFinal}>
            {/* Marks summary */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--bg-card2)",
                borderRadius: 8,
                border: `1px solid ${marksMatch ? "var(--success)" : "var(--border)"}`,
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Question marks total:{" "}
                <strong style={{ color: "var(--text)" }}>{totalQMarks}</strong>
                {questions.length > 0 && (
                  <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>
                    ({questions.length} questions)
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: marksMatch ? "var(--success)" : "var(--yellow)",
                }}
              >
                {marksMatch
                  ? "✓ Matches total marks"
                  : `Target: ${exam.totalMarks}`}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="card"
                  style={{ position: "relative" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      Question {idx + 1}
                    </h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Question Text</label>
                      <input
                        className="form-input"
                        placeholder="State Newton's First Law of Motion"
                        value={q.questionText}
                        onChange={(e) =>
                          handleQ(idx, "questionText", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div
                      className="form-group"
                      style={{ marginBottom: 0, minWidth: 110 }}
                    >
                      <label className="form-label">Max Marks</label>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={q.maxMarks}
                        onChange={(e) =>
                          handleQ(idx, "maxMarks", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Model Answer</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Newton's First Law states that an object at rest stays at rest, and an object in motion stays in motion..."
                      value={q.modelAnswer}
                      onChange={(e) =>
                        handleQ(idx, "modelAnswer", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                onClick={addQuestion}
                className="btn btn-secondary"
              >
                <Plus size={16} /> Add Question
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ marginLeft: "auto" }}
              >
                {loading ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: 16, height: 16 }}
                    />{" "}
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Create Exam
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
