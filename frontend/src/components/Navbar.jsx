import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogOut,
  BookOpen,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-glow"></div>

      <Link to="/dashboard" className="navbar-logo">

        <div className="logo-box">
          <BookOpen size={18} />
        </div>

        <div className="logo-text">
          Smart<span>Eval</span>
        </div>

        <Sparkles size={14} className="logo-sparkle" />

      </Link>

      {user && (
        <div className="navbar-right">

          <Link to="/dashboard" className="dashboard-pill">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <div className="profile-box">

            <div className="profile-avatar">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">Teacher</span>
            </div>

          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={17}/>
          </button>

        </div>
      )}
    </header>
  );
}