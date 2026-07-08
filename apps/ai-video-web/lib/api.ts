/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001" });
export interface AIModel { id: string; name: string; provider: string; capability: string; description?: string; docUrl?: string; billingRule?: { unitPrice: number; currency: string; unit: string }; parameters?: ModelParameter[]; }
export interface ModelParameter { key: string; name: string; type: "string"|"number"|"select"; defaultValue?: unknown; options?: { label: string; value: unknown }[]; min?: number; max?: number; }
export interface UserApiKey { id: string; modelId: string; keyMask: string; alias?: string; isDefault: boolean; }
export interface Project { id: string; name: string; description?: string; status: "draft"|"in_progress"|"completed"; style?: string; aspectRatio?: string; shotCount: number; createdAt: string; updatedAt: string; }
export interface CreateProjectDto { name: string; description?: string; style?: string; aspectRatio?: string; }
export interface Storyboard { id: string; projectId: string; shots: Shot[]; }
export interface Shot { id: string; sequence: number; prompt: string; imageUrl?: string; videoUrl?: string; audioUrl?: string; duration?: number; status: "pending"|"generating"|"completed"|"failed"; cameraAngle?: string; shotType?: string; }
export interface ShotPreview extends Shot { characterPrompt?: string; scenePrompt?: string; stylePrompt?: string; }
export const modelsApi = {
  listModels: (capability?: string) => api.get<any>("/models", { params: { capability } }).then((r) => r.data.data),
  getModel: (id: string) => api.get<AIModel>(`/models/${id}`).then((r) => r.data),
  createApiKey: (data: { modelId: string; apiKey: string; alias?: string; isDefault?: boolean }) => api.post<UserApiKey>("/models/api-keys", data).then((r) => r.data),
  listMyApiKeys: () => api.get<any>("/models/api-keys/my").then((r) => r.data.data),
  deleteApiKey: (id: string) => api.delete(`/models/api-keys/${id}`).then((r) => r.data),
  setPreferences: (data: { projectId: string; modelId: string }) => api.post("/models/preferences", data).then((r) => r.data),
  getPreferences: (projectId: string) => api.get(`/models/preferences/${projectId}`).then((r) => r.data),
};
export const projectsApi = {
  listProjects: () => api.get<any>("/projects").then((r) => r.data.data),
  getProject: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  createProject: (data: CreateProjectDto) => api.post<Project>("/projects", data).then((r) => r.data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};
export const storyboardApi = {
  getStoryboard: (projectId: string) => api.get<Storyboard>(`/projects/${projectId}/storyboard`).then((r) => r.data),
  generate: (projectId: string, data: { prompt: string }) => api.post<Storyboard>(`/projects/${projectId}/storyboard/generate`, data).then((r) => r.data),
  previewShot: (projectId: string, shotId: string) => api.post<ShotPreview>(`/projects/${projectId}/storyboard/shots/${shotId}/preview`).then((r) => r.data),
  deleteShot: (projectId: string, shotId: string) => api.delete(`/projects/${projectId}/storyboard/shots/${shotId}`).then((r) => r.data),
};
export default api;
