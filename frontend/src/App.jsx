import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreateExam from "./pages/CreateExam";
import UploadSheet from "./pages/UploadSheet";
import ResultsPage from "./pages/ResultsPage";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              fontFamily: "Sora, sans-serif",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#06d6a0", secondary: "#0a0a12" },
            },
            error: { iconTheme: { primary: "#ff4d6d", secondary: "#0a0a12" } },
          }}
        />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateExam />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/:id/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <UploadSheet />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/:id/results"
            element={
              <ProtectedRoute>
                <Layout>
                  <ResultsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
