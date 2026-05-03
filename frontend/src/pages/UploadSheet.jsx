import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  Upload,
  FileImage,
  X,
  CheckCircle,
  Zap,
  ArrowRight,
  Download,
} from "lucide-react";

// Vite uses import.meta.env.VITE_* instead of process.env.REACT_APP_*
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function UploadSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ studentName: "", rollNumber: "" });
  const [uploadedSheet, setUploadedSheet] = useState(null);
  const [step, setStep] = useState("form"); // form | grading | done
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/exams/${id}`)
      .then(({ data }) => setExam(data))
      .catch(() => toast.error("Exam not found"));
  }, [id]);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.studentName || !form.rollNumber)
      return toast.error("Enter student name and roll number");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("studentName", form.studentName);
      formData.append("rollNumber", form.rollNumber);
      if (file) formData.append("sheet", file);
      const { data } = await api.post(`/exams/${id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedSheet(data);
      toast.success("Sheet uploaded!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!uploadedSheet) return;
    setStep("grading");
    try {
      const { data } = await api.post(
        `/exams/${id}/grade/${uploadedSheet._id}`,
      );
      setUploadedSheet(data);
      setStep("done");
      toast.success("Grading complete!");
    } catch (err) {
      setStep("form");
      toast.error(err.response?.data?.message || "Grading failed");
    }
  };

  const resetForm = () => {
    setStep("form");
    setUploadedSheet(null);
    setFile(null);
    setForm({ studentName: "", rollNumber: "" });
  };

  if (!exam)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
      </div>
    );

  return (
    <div className="page-container fade-in" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}
        >
          {exam.subject} &rsaquo;{" "}
          <span style={{ color: "var(--accent)" }}>{exam.title}</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Upload Answer Sheet</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          Upload a student's scanned answer sheet to evaluate with AI
        </p>
        {exam.questions?.length === 0 && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 8,
              background: "rgba(255,77,109,0.1)",
              border: "1px solid var(--red)",
              fontSize: 13,
              color: "var(--red)",
            }}
          >
            ⚠️ This exam has no questions yet.{" "}
            <a
              href={`/exams/new`}
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              Add questions
            </a>{" "}
            before grading.
          </div>
        )}
      </div>

      {!uploadedSheet && (
        <form onSubmit={handleUpload} className="fade-in">
          {/* Student info */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 16,
                color: "var(--text-muted)",
              }}
            >
              STUDENT DETAILS
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Student Name</label>
                <input
                  className="form-input"
                  placeholder="Aarav Singh"
                  value={form.studentName}
                  onChange={(e) =>
                    setForm({ ...form, studentName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Roll Number</label>
                <input
                  className="form-input"
                  placeholder="101"
                  value={form.rollNumber}
                  onChange={(e) =>
                    setForm({ ...form, rollNumber: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 16,
                color: "var(--text-muted)",
              }}
            >
              ANSWER SHEET
            </h3>
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? "var(--accent)" : file ? "var(--success)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "36px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: isDragActive
                  ? "var(--accent-glow)"
                  : file
                    ? "rgba(6,214,160,0.05)"
                    : "var(--bg-card2)",
                transition: "all 0.2s",
              }}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <FileImage
                    size={36}
                    style={{ color: "var(--success)", margin: "0 auto 12px" }}
                  />
                  <p style={{ fontWeight: 600, color: "var(--success)" }}>
                    {file.name}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
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
                    style={{ color: "var(--text-dim)", margin: "0 auto 12px" }}
                  />
                  <p style={{ fontWeight: 600 }}>
                    {isDragActive
                      ? "Drop it here!"
                      : "Drag & drop answer sheet"}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    JPG, PNG, or PDF · Max 10MB
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
            <p
              style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10 }}
            >
              💡 Demo tip: File upload is optional — the system uses simulated
              OCR text if no file is provided.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} /> Upload Sheet
              </>
            )}
          </button>
        </form>
      )}

      {/* After upload */}
      {uploadedSheet && step === "form" && (
        <div
          className="card fade-in"
          style={{ textAlign: "center", padding: 40 }}
        >
          <CheckCircle
            size={48}
            style={{ color: "var(--success)", margin: "0 auto 16px" }}
          />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Sheet Uploaded!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            <strong style={{ color: "var(--text)" }}>
              {uploadedSheet.studentName}
            </strong>{" "}
            (Roll: {uploadedSheet.rollNumber}) is ready for AI grading.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button onClick={resetForm} className="btn btn-secondary">
              Upload Another
            </button>
            <button onClick={handleGrade} className="btn btn-primary btn-lg">
              <Zap size={18} /> Grade with AI <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Grading in progress */}
      {step === "grading" && (
        <div
          className="card fade-in"
          style={{ textAlign: "center", padding: 60 }}
        >
          <div
            style={{
              position: "relative",
              width: 60,
              height: 60,
              margin: "0 auto 24px",
            }}
          >
            <div
              className="spinner"
              style={{ width: 60, height: 60, borderWidth: 3 }}
            />
            <Zap
              size={22}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                color: "var(--accent)",
              }}
            />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            AI is Grading...
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Running OCR · Evaluating with Gemini · Generating PDF Report
          </p>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {["Scanning", "Analyzing", "Grading", "Generating"].map((s, i) => (
              <div
                key={s}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "var(--bg-card2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {step === "done" && uploadedSheet && (
        <div className="card fade-in" style={{ padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              Grading Complete!
            </h2>
            <div
              style={{
                display: "inline-block",
                padding: "8px 24px",
                borderRadius: 24,
                background: "var(--accent-glow)",
                border: "1px solid var(--accent)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--accent)",
                margin: "12px 0",
              }}
            >
              {uploadedSheet.totalMarks} / {uploadedSheet.maxTotalMarks}
              <span
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  marginLeft: 8,
                }}
              >
                (
                {Math.round(
                  (uploadedSheet.totalMarks / uploadedSheet.maxTotalMarks) *
                    100,
                )}
                %)
              </span>
            </div>
          </div>

          {/* Per-question results */}
          <div style={{ marginBottom: 24 }}>
            {uploadedSheet.gradingResults?.map((r) => (
              <div
                key={r.questionNumber}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-card2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  Q{r.questionNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}
                  >
                    {r.questionText}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    💬 {r.feedback}
                  </div>
                  {r.studentAnswer && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        fontStyle: "italic",
                      }}
                    >
                      Answer: &quot;{r.studentAnswer.substring(0, 80)}
                      {r.studentAnswer.length > 80 ? "..." : ""}&quot;
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    color:
                      r.marksAwarded === r.maxMarks
                        ? "var(--success)"
                        : r.marksAwarded === 0
                          ? "var(--red)"
                          : "var(--yellow)",
                  }}
                >
                  {r.marksAwarded}/{r.maxMarks}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={resetForm} className="btn btn-secondary">
              Grade Another
            </button>
            {uploadedSheet.pdfUrl && (
              <a
                href={`${API_BASE}${uploadedSheet.pdfUrl}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
              >
                <Download size={16} /> Download PDF Report
              </a>
            )}
            <button
              onClick={() => navigate(`/exams/${id}/results`)}
              className="btn btn-primary"
              style={{ marginLeft: "auto" }}
            >
              View All Results <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
