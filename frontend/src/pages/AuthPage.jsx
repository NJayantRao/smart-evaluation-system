import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import { BookOpen, Mail, Lock, User, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const { data } = await api.post(endpoint, payload);
      login(data);
      toast.success(
        `Welcome${mode === "register" ? ", " + data.name : " back"}!`,
      );
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="fade-in" style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px var(--accent-glow)",
            }}
          >
            <BookOpen size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>
            Smart<span style={{ color: "var(--accent)" }}>Eval</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            AI-powered exam evaluation
          </p>
        </div>

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-card2)",
            borderRadius: 10,
            padding: 4,
            marginBottom: 24,
            border: "1px solid var(--border)",
          }}
        >
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontFamily: "Sora, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "white" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={submit}>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User
                    size={15}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    name="name"
                    placeholder="Aarav Singh"
                    value={form.name}
                    onChange={handle}
                    required
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  name="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  value={form.email}
                  onChange={handle}
                  required
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handle}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />{" "}
                  Processing...
                </>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}{" "}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          {mode === "login"
            ? "Don't have an account? "
            : "Already registered? "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
