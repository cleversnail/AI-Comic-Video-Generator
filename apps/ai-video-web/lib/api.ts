/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001" });

// Token interceptor - auto inject Authorization header
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Types ====================

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

export interface AIModel { id: string; name: string; provider: string; capability: string; description?: string; docUrl?: string; billingRule?: { unitPrice: number; currency: string; unit: string }; parameters?: ModelParameter[]; }
export interface ModelParameter { key: string; name: string; type: "string"|"number"|"select"; defaultValue?: unknown; options?: { label: string; value: unknown }[]; min?: number; max?: number; }
export interface UserApiKey { id: string; modelId: string; keyMask: string; alias?: string; isDefault: boolean; }
export interface Project { id: string; name: string; description?: string; status: "draft"|"in_progress"|"completed"; style?: string; aspectRatio?: string; shotCount: number; createdAt: string; updatedAt: string; }
export interface CreateProjectDto { name: string; description?: string; style?: string; aspectRatio?: string; }
export interface Storyboard { id: string; projectId: string; shots: Shot[]; }
export interface Shot { id: string; sequence: number; prompt: string; imageUrl?: string; videoUrl?: string; audioUrl?: string; duration?: number; status: "pending"|"generating"|"completed"|"failed"; cameraAngle?: string; shotType?: string; }
export interface ShotPreview extends Shot { characterPrompt?: string; scenePrompt?: string; stylePrompt?: string; }

// ==================== Auth API ====================

export const authApi = {
  register: (data: { email: string; password: string; name?: string; captchaId: string; captchaText: string }) =>
    api.post<{ data: AuthResponse }>("/auth/register", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.accessToken);
      }
      return result;
    }),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>("/auth/login", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.accessToken);
      }
      return result;
    }),
  getCaptcha: () =>
    api.get<{ id: string; svg: string }>("/auth/captcha").then((r) => r.data),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  },
  isLoggedIn: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  },
};

// ==================== Models API ====================

export const modelsApi = {
  listModels: (capability?: string) => api.get<any>("/models", { params: { capability } }).then((r) => r.data.data),
  getModel: (id: string) => api.get<AIModel>(`/models/${id}`).then((r) => r.data),
  createApiKey: (data: { modelId: string; apiKey: string; alias?: string; isDefault?: boolean }) => api.post<UserApiKey>("/models/api-keys", data).then((r) => r.data),
  listMyApiKeys: () => api.get<any>("/models/api-keys/my").then((r) => r.data.data),
  deleteApiKey: (id: string) => api.delete(`/models/api-keys/${id}`).then((r) => r.data),
  setPreferences: (data: { projectId: string; modelId: string }) => api.post("/models/preferences", data).then((r) => r.data),
  getPreferences: (projectId: string) => api.get(`/models/preferences/${projectId}`).then((r) => r.data),
};

// ==================== Projects API ====================

export const projectsApi = {
  listProjects: () => api.get<any>("/projects").then((r) => r.data.data),
  getProject: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  createProject: (data: CreateProjectDto) => api.post<Project>("/projects", data).then((r) => r.data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};

// ==================== Storyboard API ====================

export const storyboardApi = {
  getStoryboard: (projectId: string) => api.get<Storyboard>(`/projects/${projectId}/storyboard`).then((r) => r.data),
  generate: (projectId: string, data: { prompt: string }) => api.post<Storyboard>(`/projects/${projectId}/storyboard/generate`, data).then((r) => r.data),
  previewShot: (projectId: string, shotId: string) => api.post<ShotPreview>(`/projects/${projectId}/storyboard/shots/${shotId}/preview`).then((r) => r.data),
  deleteShot: (projectId: string, shotId: string) => api.delete(`/projects/${projectId}/storyboard/shots/${shotId}`).then((r) => r.data),
};

// ==================== Generations API ====================

export interface GenerationTask {
  id: string;
  projectId: string;
  shotId?: string;
  capability: string;
  modelId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationDto {
  capability: string;
  modelId: string;
  shotId?: string;
  parameters?: Record<string, any>;
}

export const generationsApi = {
  createTask: (projectId: string, data: CreateGenerationDto) =>
    api.post<{ data: GenerationTask }>(`/projects/${projectId}/generations`, data).then((r) => r.data.data),
  listTasks: (projectId: string) =>
    api.get<{ data: GenerationTask[] }>(`/projects/${projectId}/generations`).then((r) => r.data.data),
  getTask: (projectId: string, taskId: string) =>
    api.get<{ data: GenerationTask }>(`/projects/${projectId}/generations/${taskId}`).then((r) => r.data.data),
};

// ==================== Compose API ====================

export interface ComposeResult {
  id: string;
  projectId: string;
  status: 'processing' | 'completed' | 'failed';
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export const composeApi = {
  composeProject: (projectId: string) =>
    api.post<{ data: ComposeResult }>(`/projects/${projectId}/compose`).then((r) => r.data.data),
};

export default api;
