import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers!.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  registerDoctor: (data: Record<string, unknown>) =>
    api.post("/auth/register/doctor", data),

  register: (data: Record<string, unknown>) =>
    api.post("/auth/register", data),

  refresh: (refresh_token: string) =>
    api.post("/auth/refresh", { refresh_token }),

  me: () => api.get("/auth/me"),

  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientApi = {
  list: (search?: string, skip = 0, limit = 20) =>
    api.get("/patients", { params: { search, skip, limit } }),

  get: (id: string) => api.get(`/patients/${id}`),

  create: (data: Record<string, unknown>) => api.post("/patients", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/patients/${id}`, data),
};

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const prescriptionApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/prescriptions", { params }),

  get: (id: string) => api.get(`/prescriptions/${id}`),

  create: (data: Record<string, unknown>) => api.post("/prescriptions", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/prescriptions/${id}`, data),

  approve: (id: string) =>
    api.post(`/prescriptions/${id}/approve`),

  updatePharmacyStatus: (id: string, data: Record<string, unknown>) =>
    api.patch(`/prescriptions/${id}/pharmacy-status`, data),

  transcribeAudio: (audioBlob: Blob, language = "en") => {
    const form = new FormData();
    form.append("audio", audioBlob, "recording.webm");
    form.append("language", language);
    return api.post("/prescriptions/transcribe", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  extractNLP: (transcript: string, language = "en") =>
    api.post("/prescriptions/extract-nlp", { transcript, language }),

  downloadPdf: (id: string) =>
    api.get(`/prescriptions/${id}/pdf`, { responseType: "blob" }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get("/analytics/dashboard"),
  auditLogs: (params?: Record<string, unknown>) =>
    api.get("/analytics/audit-logs", { params }),
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => api.get("/auth/profile"),
  update: (data: Record<string, unknown>) => api.put("/auth/profile", data),
};
