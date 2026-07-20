/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
});

// Token interceptor - auto inject Authorization header
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
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
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      // Don't redirect if already on login page
      if (!window.location.pathname.includes("login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ==================== Types ====================

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capability: string;
  description?: string;
  docUrl?: string;
  billingRule?: { unitPrice: number; currency: string; unit: string };
  parameters?: ModelParameter[];
}
export interface ModelParameter {
  key: string;
  name: string;
  type: "string" | "number" | "select";
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
}
export interface UserApiKey {
  id: string;
  modelId: string;
  keyMask: string;
  alias?: string;
  isDefault: boolean;
}
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "in_progress" | "completed";
  style?: string;
  aspectRatio?: string;
  shotCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateProjectDto {
  name: string;
  description?: string;
  style?: string;
  aspectRatio?: string;
}
export interface Storyboard {
  id: string;
  projectId: string;
  shots: Shot[];
}
export interface Shot {
  id: string;
  sequence: number;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  status: "pending" | "generating" | "completed" | "failed";
  cameraAngle?: string;
  shotType?: string;
}
export interface ShotPreview extends Shot {
  characterPrompt?: string;
  scenePrompt?: string;
  stylePrompt?: string;
}

export interface Character {
  id: string;
  name: string;
  gender?: string;
  age?: number;
  role?: string;
  personality?: string;
  appearance?: string;
  outfit?: string;
  prompt?: string;
  mainImage?: string;
  viewImages?: {
    front?: string;
    three_quarter?: string;
    side?: string;
    back?: string;
  };
  variants?: {
    type: string;
    imageUrl: string;
    description: string;
    createdAt: string;
  }[];
  lockLevel: "loose" | "medium" | "strict";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterDto {
  name: string;
  gender?: string;
  age?: number;
  role?: string;
  personality?: string;
  appearance?: string;
  outfit?: string;
  lockLevel?: "loose" | "medium" | "strict";
}

export interface LockLevelInfo {
  key: string;
  label: string;
  description: string;
  color: string;
}

// ==================== Auth API ====================

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name?: string;
    captchaId: string;
    captchaText: string;
  }) =>
    api.post<{ data: AuthResponse }>("/auth/register", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", result.accessToken);
      }
      return result;
    }),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>("/auth/login", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", result.accessToken);
      }
      return result;
    }),
  getCaptcha: () =>
    api.get<{ id: string; svg: string }>("/auth/captcha").then((r) => r.data),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
  },
  isLoggedIn: () => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("accessToken");
  },
};

// ==================== Models API ====================

export const modelsApi = {
  listModels: (capability?: string) =>
    api
      .get<any>("/models", { params: { capability } })
      .then((r) => r.data.data),
  getModel: (id: string) =>
    api.get<AIModel>(`/models/${id}`).then((r) => r.data),
  createApiKey: (data: {
    modelId: string;
    apiKey: string;
    alias?: string;
    isDefault?: boolean;
  }) => api.post<UserApiKey>("/models/api-keys", data).then((r) => r.data),
  listMyApiKeys: () =>
    api.get<any>("/models/api-keys/my").then((r) => r.data.data),
  deleteApiKey: (id: string) =>
    api.delete(`/models/api-keys/${id}`).then((r) => r.data),
  setPreferences: (data: { projectId: string; modelId: string }) =>
    api.post("/models/preferences", data).then((r) => r.data),
  getPreferences: (projectId: string) =>
    api.get(`/models/preferences/${projectId}`).then((r) => r.data),
};

// ==================== Projects API ====================

export const projectsApi = {
  listProjects: () => api.get<any>("/projects").then((r) => r.data.data),
  getProject: (id: string) =>
    api.get<Project>(`/projects/${id}`).then((r) => r.data),
  createProject: (data: CreateProjectDto) =>
    api.post<Project>("/projects", data).then((r) => r.data),
  updateProject: (id: string, data: Partial<CreateProjectDto>) =>
    api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  deleteProject: (id: string) =>
    api.delete(`/projects/${id}`).then((r) => r.data),
};

// ==================== Storyboard API ====================

export const storyboardApi = {
  getStoryboard: (projectId: string) =>
    api
      .get<Storyboard>(`/projects/${projectId}/storyboard`)
      .then((r) => r.data),
  generate: (projectId: string, data: { story: string; style?: string; characterDescriptions?: string[] }) =>
    api
      .post<Storyboard>(`/projects/${projectId}/storyboard/generate`, data)
      .then((r) => r.data),
  previewShot: (projectId: string, shotId: string) =>
    api
      .post<ShotPreview>(
        `/projects/${projectId}/storyboard/shots/${shotId}/preview`,
      )
      .then((r) => r.data),
  deleteShot: (projectId: string, shotId: string) =>
    api
      .delete(`/projects/${projectId}/storyboard/shots/${shotId}`)
      .then((r) => r.data),
};

// ==================== Characters API ====================

export const charactersApi = {
  listCharacters: (projectId: string) =>
    api
      .get<{ data: Character[] }>(`/projects/${projectId}/characters`)
      .then((r) => r.data.data),
  getCharacter: (projectId: string, characterId: string) =>
    api
      .get<{
        data: Character;
      }>(`/projects/${projectId}/characters/${characterId}`)
      .then((r) => r.data.data),
  createCharacter: (projectId: string, data: CreateCharacterDto) =>
    api
      .post<{ data: Character }>(`/projects/${projectId}/characters`, data)
      .then((r) => r.data.data),
  updateCharacter: (
    projectId: string,
    characterId: string,
    data: Partial<CreateCharacterDto>,
  ) =>
    api
      .put<{
        data: Character;
      }>(`/projects/${projectId}/characters/${characterId}`, data)
      .then((r) => r.data.data),
  deleteCharacter: (projectId: string, characterId: string) =>
    api
      .delete(`/projects/${projectId}/characters/${characterId}`)
      .then((r) => r.data),
  updateLockLevel: (
    projectId: string,
    characterId: string,
    lockLevel: "loose" | "medium" | "strict",
  ) =>
    api
      .put<{
        data: Character;
      }>(`/projects/${projectId}/characters/${characterId}/lock-level`, {
        lockLevel,
      })
      .then((r) => r.data.data),
  generateViews: (projectId: string, characterId: string) =>
    api
      .post<{ data: { characterId: string; viewImages: Record<string, string> } }>(
        `/projects/${projectId}/characters/${characterId}/generate-views`,
      )
      .then((r) => r.data.data),
  generateVariant: (
    projectId: string,
    characterId: string,
    variantType: string,
  ) =>
    api
      .post<{ data: { characterId: string; variant: any } }>(
        `/projects/${projectId}/characters/${characterId}/variants/${variantType}`,
      )
      .then((r) => r.data.data),
};

// ==================== Generations API ====================

export interface GenerationTask {
  id: string;
  projectId: string;
  shotId?: string;
  capability: string;
  modelId: string;
  status: "queued" | "processing" | "completed" | "failed";
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
    api
      .post<{
        data: GenerationTask;
      }>(`/projects/${projectId}/generations`, data)
      .then((r) => r.data.data),
  listTasks: (projectId: string) =>
    api
      .get<{ data: GenerationTask[] }>(`/projects/${projectId}/generations`)
      .then((r) => r.data.data),
  getTask: (projectId: string, taskId: string) =>
    api
      .get<{
        data: GenerationTask;
      }>(`/projects/${projectId}/generations/${taskId}`)
      .then((r) => r.data.data),
};

// ==================== Compose API ====================

export interface ComposeResult {
  id: string;
  projectId: string;
  status: "processing" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export const composeApi = {
  composeProject: (projectId: string) =>
    api
      .post<{ data: ComposeResult }>(`/projects/${projectId}/compose`)
      .then((r) => r.data.data),
};

export const LOCK_LEVELS: LockLevelInfo[] = [
  {
    key: "loose",
    label: "宽松",
    description: "允许造型变化，适合创意发散",
    color: "green",
  },
  {
    key: "medium",
    label: "中等",
    description: "兼顾一致性和画面自由度",
    color: "yellow",
  },
  {
    key: "strict",
    label: "严格",
    description: "强制保持角色形象一致",
    color: "red",
  },
];

export default api;
