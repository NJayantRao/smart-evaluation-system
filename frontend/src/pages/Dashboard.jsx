import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Plus,
  BookOpen,
  ChevronRight,
  Trash2,
  Users,
  ClipboardList,
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
            <span style={{ color: "var(--accent)" }}>{user?.name}</span> 👋
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            Manage your exams and view student results
          </p>
        </div>
        <Link to="/exams/new" className="btn btn-primary">
          <Plus size={16} /> New Exam
        </Link>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Total Exams",
            value: exams.length,
            icon: <ClipboardList size={20} />,
            color: "var(--accent)",
          },
          {
            label: "Active",
            value: exams.filter((e) => e.questions?.length > 0).length,
            icon: <BookOpen size={20} />,
            color: "var(--accent2)",
          },
          {
            label: "This Month",
            value: exams.filter(
              (e) =>
                new Date(e.createdAt) > new Date(Date.now() - 30 * 86400000),
            ).length,
            icon: <Users size={20} />,
            color: "var(--yellow)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 16 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: `${stat.color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: stat.color,
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
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
          <div>
            {exams.map((exam) => (
              <div
                key={exam._id}
                onClick={() => navigate(`/exams/${exam._id}/results`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(108,99,255,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: "var(--bg-card2)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {exam.subject?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{exam.title}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {exam.subject} &middot; {exam.totalMarks} marks &middot;{" "}
                      {exam.questions?.length || 0} questions
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {new Date(exam.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <Link
                    to={`/exams/${exam._id}/upload`}
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Upload
                  </Link>
                  <button
                    onClick={(e) => deleteExam(exam._id, e)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={12} />
                  </button>
                  <ChevronRight
                    size={16}
                    style={{ color: "var(--text-dim)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
