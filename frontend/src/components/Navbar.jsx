import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, BookOpen, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={18} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
          Smart<span style={{ color: "var(--accent)" }}>Eval</span>
        </span>
      </Link>

      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/dashboard"
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            <LayoutDashboard size={14} /> Dashboard
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                color: "white",
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {user.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </nav>
  );
}
