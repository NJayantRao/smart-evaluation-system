import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Plus,
  BookOpen,
  ChevronRight,
  Users,
  ClipboardList,
  Trash2,
  FileText,
  CalendarDays,
  Target,
} from "lucide-react";

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/exams")
      .then(({ data }) => setExams(data))
      .catch(() => toast.error("Failed to load exams"))
      .finally(() => setLoading(false));
  }, []);

  const deleteExam = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this exam and all its results?")) return;
    try {
      await api.delete(`/exams/${id}`);
      setExams(exams.filter((ex) => ex._id !== id));
      toast.success("Exam deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>
            Welcome back,{" "}
            <span style={{ color: "var(--accent)" }}>{user?.name}</span>
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            Manage your exams and view student results
          </p>
        </div>
        <Link to="/exams/new" className="new-exam-btn">
          <Plus size={20} strokeWidth={2.5} />
          <span>New Exam</span>
          <span className="sparkle">✦</span>
        </Link>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
  {[
    {
      label: "Total Exams",
      value: exams.length,
      icon: <ClipboardList size={22} />,
      color: "purple",
    },
    {
      label: "Active",
      value: exams.filter((e) => e.questions?.length > 0).length,
      icon: <BookOpen size={22} />,
      color: "green",
    },
    {
      label: "This Month",
      value: exams.filter(
        (e) =>
          new Date(e.createdAt) > new Date(Date.now() - 30 * 86400000)
      ).length,
      icon: <Users size={22} />,
      color: "orange",
    },
  ].map((stat) => (
    <div key={stat.label} className={`stat-card ${stat.color}`}>
      <div className="stat-icon">
        {stat.icon}
      </div>

      <div className="stat-content">
        <h2>{stat.value}</h2>
        <p>{stat.label}</p>
      </div>

      <div className="stat-graph"></div>
    </div>
  ))}
</div>

      {/* Exams list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Your Exams</h2>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {exams.length} total
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : exams.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <BookOpen
              size={40}
              style={{ color: "var(--text-dim)", margin: "0 auto 16px" }}
            />
            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
              No exams yet. Create your first one!
            </p>
            <Link to="/exams/new" className="btn btn-primary">
              <Plus size={16} /> Create Exam
            </Link>
          </div>
        ) : (
          <div className="exam-list">
  {exams.map((exam) => (
    <div
      key={exam._id}
      className="exam-card"
      onClick={() => navigate(`/exams/${exam._id}/results`)}
    >
      <div className="shine"></div>

      <FileText size={90} className="exam-bg-icon" />

      <div className="exam-left">
        <div className="exam-avatar">
          {exam.subject?.charAt(0).toUpperCase()}
        </div>

        <div className="exam-content">
          <h3 className="exam-title">{exam.title}</h3>

          <span className="subject-badge">
            {exam.subject}
          </span>

          <div className="exam-meta">

            <div className="meta-item">
              <BookOpen size={15} />
              <span>{exam.questions?.length || 0} Questions</span>
            </div>

            <div className="meta-item">
              <Target size={15} />
              <span>{exam.totalMarks} Marks</span>
            </div>

            <div className="meta-item">
              <CalendarDays size={15} />
              <span>
                {new Date(exam.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

          </div>
        </div>
      </div>

      <div className="exam-actions">
        <Link
          to={`/exams/${exam._id}/upload`}
          className="upload-btn"
          onClick={(e) => e.stopPropagation()}
        >
          Upload
        </Link>

        <button
          className="delete-btn"
          onClick={(e) => deleteExam(exam._id, e)}
        >
          <Trash2 size={17} />
        </button>

        <ChevronRight className="arrow-icon" size={20} />
      </div>
    </div>
  ))}
</div>
        )}
      </div>
    </div>
  );
}
