import axios from "axios";
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : "/api";

const api = axios.create({
  baseURL: API_BASE,
});

// Auto-attach token from storage on every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("smart-eval-user");
  if (stored) {
    const { token } = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("smart-eval-user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
