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
      window.dispatchEvent(new Event('auth-changed'));
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
export interface UserApiKey {
  id: string;
  modelId: string;
  modelName?: string;
  keyMask: string;
  alias?: string;
  isDefault: boolean;
  capability?: string;
  status?: string;
  totalCalls?: number;
  estimatedCost?: number;
}
export interface Project { id: string; name: string; description?: string; status: "draft"|"in_progress"|"completed"; style?: string; aspectRatio?: string; shotCount?: number; characterCount?: number; createdAt: string; updatedAt: string; characters?: Character[]; storyboard?: { id: string; shots: Shot[] }; shots?: Shot[]; }
export interface CreateProjectDto { name: string; description?: string; style?: string; aspectRatio?: string; }
export interface ModelPreferenceConfig { modelId: string; apiKeyId?: string; parameters?: Record<string, unknown>; }
export interface ModelPreference { id: string; projectId: string; defaults: Record<string, ModelPreferenceConfig>; createdAt: string; updatedAt: string; }

// ==================== Character Types ====================
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
  images?: string[];
  viewImages?: {
    front?: string;
    three_quarter?: string;
    side?: string;
    back?: string;
  };
  variants?: CharacterVariant[];
  lockLevel?: 'loose' | 'medium' | 'strict';
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterVariant {
  id: string;
  type: string;
  imageUrl: string;
  description: string;
  createdAt: string;
}

export interface CreateCharacterDto {
  name: string;
  gender?: string;
  age?: number;
  role?: string;
  personality?: string;
  appearance?: string;
  outfit?: string;
  lockLevel?: 'loose' | 'medium' | 'strict';
}

export interface UpdateCharacterDto {
  name?: string;
  gender?: string;
  age?: number;
  role?: string;
  personality?: string;
  appearance?: string;
  outfit?: string;
  lockLevel?: 'loose' | 'medium' | 'strict';
  prompt?: string;
}

export interface VariantType {
  value: string;
  label: string;
  category: string;
}

export interface LibraryCharacter {
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
  viewImages?: Record<string, string>;
  variants?: Array<{ id: string; type: string; imageUrl: string; description: string }>;
  lockLevel?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ==================== Storyboard Types ====================
export interface Storyboard { id: string; projectId: string; shots: Shot[]; }

export interface Shot {
  id: string;
  sequence: number;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  resultUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  status: "pending"|"generating"|"completed"|"failed"|"draft"|"previewed";
  cameraAngle?: string;
  shotType?: string;
  characterIds?: string[];
  characters?: string[];
  params?: {
    title?: string;
    description?: string;
    characters?: string[];
    characterIds?: string[];
    scene?: string;
    emotion?: string;
    dialogue?: string;
    narration?: string;
    subtitle?: string;
    audioUrl?: string;
    shotType?: string;
    cameraAngle?: string;
    lighting?: string;
    camera?: {
      shotSize?: string;
      angle?: string;
      movement?: string;
      lighting?: string;
      mood?: string;
    };
    [key: string]: any;
  };
}
export interface ShotPreview extends Shot { characterPrompt?: string; scenePrompt?: string; stylePrompt?: string; }

// ==================== Update Shot DTO ====================
export interface UpdateShotDto {
  prompt?: string;
  negativePrompt?: string;
  duration?: number;
  characterIds?: string[];
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  emotion?: string;
  lighting?: string;
  dialogue?: string;
  narration?: string;
  subtitle?: string;
  title?: string;
  description?: string;
}

// ==================== Auth API ====================

export const authApi = {
  register: (data: { email: string; password: string; name?: string; captchaId: string; captchaText: string }) =>
    api.post<{ data: AuthResponse }>("/auth/register", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.accessToken);
        window.dispatchEvent(new Event('auth-changed'));
      }
      return result;
    }),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>("/auth/login", data).then((r) => {
      const result = r.data.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.accessToken);
        window.dispatchEvent(new Event('auth-changed'));
      }
      return result;
    }),
  getCaptcha: () =>
    api.get<{ id: string; svg: string }>("/auth/captcha").then((r) => r.data),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.dispatchEvent(new Event('auth-changed'));
    }
  },
  isLoggedIn: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  },
};

// ==================== Models API ====================

export interface CostSummary {
  totalCalls: number;
  totalCost: number;
  byCapability: Array<{ capability: string; calls: number; cost: number }>;
  keys: Array<{
    id: string;
    modelId: string;
    modelName: string;
    capability: string;
    alias: string;
    totalCalls: number;
    estimatedCost: number;
  }>;
}

export interface ProjectCostSummary {
  projectId: string;
  totalTasks: number;
  totalCost: number;
  byCapability: Array<{ capability: string; count: number; cost: number }>;
}

export const modelsApi = {
  listModels: (capability?: string) => api.get<any>("/models", { params: { capability } }).then((r) => r.data.data),
  getModel: (id: string) => api.get<AIModel>(`/models/${id}`).then((r) => r.data),
  createApiKey: (data: { modelId: string; apiKey: string; alias?: string; isDefault?: boolean }) => api.post<UserApiKey>("/models/api-keys", data).then((r) => r.data),
  listMyApiKeys: () => api.get<any>("/models/api-keys/my").then((r) => r.data.data),
  deleteApiKey: (id: string) => api.delete(`/models/api-keys/${id}`).then((r) => r.data),
  updateApiKey: (id: string, data: { apiKey?: string; alias?: string; isDefault?: boolean }) =>
    api.put<{ data: UserApiKey }>(`/models/api-keys/${id}`, data).then((r) => r.data.data),
  setPreferences: (data: { projectId: string; defaults: Record<string, ModelPreferenceConfig> }) =>
    api.post<{ data: ModelPreference }>("/models/preferences", data).then((r) => r.data.data),
  getPreferences: (projectId: string) =>
    api.get<{ data: ModelPreference }>(`/models/preferences/${projectId}`).then((r) => r.data.data),
  getCostSummary: () => api.get<{ data: CostSummary }>("/models/cost/summary").then((r) => r.data.data),
  getProjectCost: (projectId: string) => api.get<{ data: ProjectCostSummary }>(`/models/cost/project/${projectId}`).then((r) => r.data.data),
};

// ==================== Projects API ====================

export interface ProjectVersion {
  id: string;
  version: number;
  label: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  description?: string;
  status: string;
  storyboardCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  coverUrl?: string;
  isPublic: boolean;
  favoriteCount: number;
  usageCount: number;
  createdAt: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  coverUrl?: string;
  isPublic?: boolean;
}

export const projectsApi = {
  listProjects: () => api.get<any>("/projects").then((r) => r.data.data),
  getProject: (id: string) => api.get<{ data: Project }>(`/projects/${id}`).then((r) => r.data.data),
  createProject: (data: CreateProjectDto) => api.post<{ data: Project }>("/projects", data).then((r) => r.data.data),
  updateProject: (id: string, data: Partial<CreateProjectDto>) => api.patch<{ data: Project }>(`/projects/${id}`, data).then((r) => r.data.data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
  // Version APIs
  createVersion: (id: string, label?: string) =>
    api.post<{ data: ProjectVersion }>(`/projects/${id}/versions`, { label }).then((r) => r.data.data),
  listVersions: (id: string) =>
    api.get<{ data: ProjectVersion[] }>(`/projects/${id}/versions`).then((r) => r.data.data),
  getVersion: (id: string, versionId: string) =>
    api.get<{ data: ProjectVersion & { snapshot: Record<string, unknown> } }>(`/projects/${id}/versions/${versionId}`).then((r) => r.data.data),
  restoreVersion: (id: string, versionId: string) =>
    api.post<{ data: { restoredVersion: number; label: string } }>(`/projects/${id}/versions/${versionId}/restore`).then((r) => r.data.data),
  deleteVersion: (id: string, versionId: string) =>
    api.delete(`/projects/${id}/versions/${versionId}`).then((r) => r.data),
  // Episode APIs
  listEpisodes: (id: string) =>
    api.get<{ data: Episode[] }>(`/projects/${id}/episodes`).then((r) => r.data.data),
  createEpisode: (id: string, data: { title?: string; description?: string }) =>
    api.post<{ data: Episode }>(`/projects/${id}/episodes`, data).then((r) => r.data.data),
  getEpisode: (id: string, episodeId: string) =>
    api.get<{ data: Episode }>(`/projects/${id}/episodes/${episodeId}`).then((r) => r.data.data),
  updateEpisode: (id: string, episodeId: string, data: { title?: string; description?: string; status?: string }) =>
    api.put<{ data: Episode }>(`/projects/${id}/episodes/${episodeId}`, data).then((r) => r.data.data),
  deleteEpisode: (id: string, episodeId: string) =>
    api.delete(`/projects/${id}/episodes/${episodeId}`).then((r) => r.data),
  // Template APIs
  saveAsTemplate: (id: string, data: CreateTemplateDto) =>
    api.post<{ data: Template }>(`/projects/${id}/save-as-template`, data).then((r) => r.data.data),
};

// ==================== Templates API ====================

export const templatesApi = {
  list: (category?: string, search?: string) =>
    api.get<{ data: Template[] }>("/templates", { params: { category, search } }).then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: Template }>(`/templates/${id}`).then((r) => r.data.data),
  getFavorites: () =>
    api.get<{ data: Template[] }>("/templates/favorites").then((r) => r.data.data),
  clone: (id: string, projectName?: string) =>
    api.post<{ data: Project }>(`/templates/${id}/clone`, { projectName }).then((r) => r.data.data),
  toggleFavorite: (id: string) =>
    api.post<{ data: { favorited: boolean } }>(`/templates/${id}/favorite`).then((r) => r.data.data),
  update: (id: string, data: Partial<CreateTemplateDto>) =>
    api.put<{ data: Template }>(`/templates/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/templates/${id}`).then((r) => r.data),
};

// ==================== Characters API ====================

export const charactersApi = {
  listCharacters: (projectId: string) =>
    api.get<{ data: Character[] }>(`/projects/${projectId}/characters`).then((r) => r.data.data),
  getCharacter: (projectId: string, characterId: string) =>
    api.get<{ data: Character }>(`/projects/${projectId}/characters/${characterId}`).then((r) => r.data.data),
  createCharacter: (projectId: string, data: CreateCharacterDto) =>
    api.post<{ data: Character }>(`/projects/${projectId}/characters`, data).then((r) => r.data.data),
  updateCharacter: (projectId: string, characterId: string, data: UpdateCharacterDto) =>
    api.put<{ data: Character }>(`/projects/${projectId}/characters/${characterId}`, data).then((r) => r.data.data),
  deleteCharacter: (projectId: string, characterId: string) =>
    api.delete(`/projects/${projectId}/characters/${characterId}`).then((r) => r.data),
  generateViews: (projectId: string, characterId: string) =>
    api.post<{ data: { characterId: string; viewImages: Record<string, string> } }>(
      `/projects/${projectId}/characters/${characterId}/generate-views`
    ).then((r) => r.data.data),
  clearViews: (projectId: string, characterId: string) =>
    api.delete(`/projects/${projectId}/characters/${characterId}/views`).then((r) => r.data),
  generateVariant: (projectId: string, characterId: string, variantType: string) =>
    api.post<{ data: { characterId: string; variant: CharacterVariant } }>(
      `/projects/${projectId}/characters/${characterId}/variants/${variantType}`
    ).then((r) => r.data.data),
  deleteVariant: (projectId: string, characterId: string, variantId: string) =>
    api.delete(`/projects/${projectId}/characters/${characterId}/variants/${variantId}`).then((r) => r.data),
  getVariantTypes: () =>
    api.get<{ data: VariantType[] }>('/projects/0/characters/variant-types').then((r) => r.data.data),
  // Character Library APIs
  saveToLibrary: (projectId: string, characterId: string, tags?: string[]) =>
    api.post<{ data: LibraryCharacter }>(
      `/projects/${projectId}/characters/${characterId}/save-to-library`,
      { tags }
    ).then((r) => r.data.data),
  importFromLibrary: (projectId: string, libraryCharacterId: string) =>
    api.post<{ data: Character }>(
      `/projects/${projectId}/characters/import-from-library/${libraryCharacterId}`
    ).then((r) => r.data.data),
};

// ==================== Character Library API ====================

export const characterLibraryApi = {
  list: (tag?: string) =>
    api.get<{ data: LibraryCharacter[] }>('/character-library', { params: { tag } }).then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: LibraryCharacter }>(`/character-library/${id}`).then((r) => r.data.data),
  create: (data: Partial<LibraryCharacter>) =>
    api.post<{ data: LibraryCharacter }>('/character-library', data).then((r) => r.data.data),
  update: (id: string, data: Partial<LibraryCharacter>) =>
    api.put<{ data: LibraryCharacter }>(`/character-library/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/character-library/${id}`).then((r) => r.data),
  getReferences: (id: string) =>
    api.get<{ data: { libraryCharacter: LibraryCharacter; references: Array<{ id: string; projectId: string; projectName: string; name: string }> } }>(
      `/character-library/${id}/references`
    ).then((r) => r.data.data),
};

// ==================== Storyboard API ====================

export interface AuditResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  summary: string;
  details: {
    structure: { score: number; feedback: string };
    dialogue: { score: number; feedback: string };
    pacing: { score: number; feedback: string };
    visual: { score: number; feedback: string };
    emotion: { score: number; feedback: string };
  };
  suggestions: string[];
}

export const storyboardApi = {
  getStoryboard: (projectId: string) => api.get<Storyboard>(`/projects/${projectId}/storyboard`).then((r) => r.data),
  generate: (projectId: string, data: { prompt: string; characterIds?: string[] }) =>
    api.post<Storyboard>(`/projects/${projectId}/storyboard/generate`, {
      story: data.prompt,
      characterIds: data.characterIds,
    }).then((r) => r.data),
  previewShot: (projectId: string, shotId: string, customPrompt?: string) =>
    api.post<ShotPreview>(`/projects/${projectId}/storyboard/shots/${shotId}/preview`, { customPrompt }).then((r) => r.data),
  updateShot: (projectId: string, shotId: string, data: UpdateShotDto) =>
    api.patch<Shot>(`/projects/${projectId}/storyboard/shots/${shotId}`, data).then((r) => r.data),
  deleteShot: (projectId: string, shotId: string) =>
    api.delete(`/projects/${projectId}/storyboard/shots/${shotId}`).then((r) => r.data),
  generateTts: (projectId: string, shotId: string, data: { voiceId?: string; speed?: number }) =>
    api.post<{ data: { shotId: string; audioUrl: string; duration: number } }>(
      `/projects/${projectId}/storyboard/shots/${shotId}/tts`, data
    ).then((r) => r.data.data),
  generateTtsBatch: (projectId: string, data: { shotIds?: string[]; voiceId?: string; speed?: number }) =>
    api.post<{ data: { total: number; success: number; failed: number; results: Array<{ shotId: string; audioUrl: string; duration: number; status: string }> } }>(
      `/projects/${projectId}/storyboard/tts/batch`, data
    ).then((r) => r.data.data),
  auditScript: (projectId: string) =>
    api.post<{ data: AuditResult }>(`/projects/${projectId}/storyboard/audit`).then((r) => r.data.data),
  previewNovelSplit: (projectId: string, data: { text: string; config?: NovelSplitConfig }) =>
    api.post<{ data: NovelSplitPreview }>(`/projects/${projectId}/storyboard/novel/preview`, data).then((r) => r.data.data),
  executeNovelSplit: (projectId: string, data: { text: string; config?: NovelSplitConfig }) =>
    api.post<{ data: { totalEpisodes: number; episodes: Record<string, unknown>[] } }>(`/projects/${projectId}/storyboard/novel/split`, data).then((r) => r.data.data),
};

export interface NovelSplitConfig {
  targetDuration?: number;
  targetEpisodes?: number;
  splitByChapter?: boolean;
  chapterPattern?: string;
}

export interface NovelSplitPreview {
  totalEpisodes: number;
  episodes: Array<{
    number: number;
    title: string;
    content: string;
    estimatedDuration: number;
    wordCount: number;
  }>;
  totalWords: number;
  averageWordsPerEpisode: number;
}

// ==================== Generations API ====================

export interface GenerationTask {
  id: string;
  projectId: string;
  shotId?: string;
  capability: string;
  modelId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    url?: string;
    audioUrl?: string;
    taskId?: string;
    duration?: number;
    status?: string;
  };
  resultUrl?: string;  // 兼容旧格式
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationDto {
  capability: string;
  modelId: string;
  shotId?: string;
  parameters?: Record<string, unknown>;
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
  projectId: string;
  shots: number;
  totalDuration: number;
  status: 'ready' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  aspectRatio: string;
  maxWidth: number;
  maxHeight: number;
  maxDuration: number;
  subtitleStyle: {
    fontSize: number;
    position: 'bottom' | 'top' | 'center';
    margin: number;
  };
  metadata: {
    maxTitleLength: number;
    maxDescriptionLength: number;
    maxTags: number;
  };
}

export interface DistributeConfig {
  platformId: string;
  title: string;
  description?: string;
  tags?: string[];
  coverUrl?: string;
}

export enum Viseme {
  SIL = 0, PP = 1, FF = 2, TH = 3, DD = 4, kk = 5,
  CH = 6, SS = 7, nn = 8, RR = 9, aa = 10, E = 11,
  ih = 12, oh = 13, ou = 14,
}

export interface VisemeFrame {
  time: number;
  viseme: Viseme;
  weight: number;
}

export interface LipSyncTrack {
  duration: number;
  frames: VisemeFrame[];
  metadata: {
    language: string;
    model: string;
    generatedAt: string;
  };
}

export interface LipSyncConfig {
  language?: 'zh' | 'en' | 'ja';
  intensity?: number;
  smoothness?: number;
  autoCorrectDrift?: boolean;
}

// ==================== Agent Types ====================

export type AgentRole = 'writer' | 'storyboard_artist' | 'director' | 'character_designer' | 'reviewer';

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  stepCount: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentRole: AgentRole;
  inputTemplate: string;
  outputKey: string;
  dependencies?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowResult {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  steps: Array<{
    stepId: string;
    agentRole: AgentRole;
    status: string;
    output?: string;
    error?: string;
  }>;
  finalOutput?: Record<string, unknown>;
}

export const composeApi = {
  composeProject: (projectId: string) =>
    api.post<{ data: ComposeResult }>(`/projects/${projectId}/compose`).then((r) => r.data.data),
  getPlatforms: () =>
    api.get<{ data: PlatformConfig[] }>('/projects/0/compose/distribute/platforms').then((r) => r.data.data),
  getPlatform: (platformId: string) =>
    api.get<{ data: PlatformConfig }>(`/projects/0/compose/distribute/platforms/${platformId}`).then((r) => r.data.data),
  getSuggestedConfig: (projectId: string, platformId: string) =>
    api.get<{ data: { platform: PlatformConfig; suggestedTitle: string; suggestedDescription: string; suggestedTags: string[]; videoDuration: number; needsTrim: boolean } }>(
      `/projects/${projectId}/compose/distribute/suggest/${platformId}`
    ).then((r) => r.data.data),
  validateConfig: (config: DistributeConfig) =>
    api.post<{ valid: boolean; errors: string[] }>('/projects/0/compose/distribute/validate', config).then((r) => r.data),
  exportPackages: (projectId: string, configs: DistributeConfig[]) =>
    api.post<{ data: { totalPlatforms: number; validPlatforms: number; allValid: boolean; results: Array<{ platformId: string; platformName: string; config: DistributeConfig; validation: { valid: boolean; errors: string[] } }> } }>(
      `/projects/${projectId}/compose/distribute/export`, configs
    ).then((r) => r.data.data),
  // Lip Sync APIs
  generateLipSync: (projectId: string, shotId: string, config?: LipSyncConfig) =>
    api.post<{ data: LipSyncTrack }>(`/projects/${projectId}/compose/shots/${shotId}/lip-sync`, config).then((r) => r.data.data),
  generateLipSyncFromText: (projectId: string, data: { text: string; duration: number; config?: LipSyncConfig }) =>
    api.post<{ data: LipSyncTrack }>(`/projects/${projectId}/compose/lip-sync/generate`, data).then((r) => r.data.data),
  smoothLipSync: (projectId: string, track: LipSyncTrack, windowSize?: number) =>
    api.post<{ data: LipSyncTrack }>(`/projects/${projectId}/compose/lip-sync/smooth`, { track, windowSize }).then((r) => r.data.data),
  correctLipSyncDrift: (projectId: string, track: LipSyncTrack, audioDuration: number) =>
    api.post<{ data: LipSyncTrack }>(`/projects/${projectId}/compose/lip-sync/correct-drift`, { track, audioDuration }).then((r) => r.data.data),
};

// ==================== Agents API ====================

export const agentsApi = {
  getWorkflows: (projectId: string) =>
    api.get<{ data: WorkflowSummary[] }>(`/projects/${projectId}/agents/workflows`).then((r) => r.data.data),
  getWorkflow: (projectId: string, workflowId: string) =>
    api.get<{ data: Workflow }>(`/projects/${projectId}/agents/workflows/${workflowId}`).then((r) => r.data.data),
  executeWorkflow: (projectId: string, workflowId: string, inputs: Record<string, string>) =>
    api.post<{ data: WorkflowResult }>(`/projects/${projectId}/agents/workflows/${workflowId}/execute`, { inputs }).then((r) => r.data.data),
  executeAgent: (projectId: string, data: { role: AgentRole; input: string; context?: Record<string, unknown> }) =>
    api.post<{ data: { output: string } }>(`/projects/${projectId}/agents/execute`, data).then((r) => r.data.data),
};

export default api;
