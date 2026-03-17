import { create } from 'zustand';
import type { Project, ProjectRef } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, deleteFromSupabase, syncToSupabase } from '@/lib/db';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  loadProjects: () => void;
  createProject: (name: string, description?: string) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addRef: (projectId: string, ref: Omit<ProjectRef, 'linkedAt'>) => void;
  setCurrentProjectId: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
  getOrCreateProject: (name: string) => string;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,

  loadProjects: () => {
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
    set({ projects });
    // Background sync to Supabase
    syncToSupabase('projects', projects);
  },

  createProject: (name, description = '') => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name,
      description,
      refs: [],
      created_at: now,
      updated_at: now,
    };
    const projects = [...get().projects, project];
    set({ projects, currentProjectId: project.id });
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    upsertToSupabase('projects', project);
    return project.id;
  },

  updateProject: (id, data) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    );
    set({ projects });
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    const updated = get().projects.find(p => p.id === id);
    if (updated) upsertToSupabase('projects', updated);
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    const currentProjectId = get().currentProjectId === id ? null : get().currentProjectId;
    set({ projects, currentProjectId });
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    deleteFromSupabase('projects', id);
  },

  addRef: (projectId, ref) => {
    const projects = get().projects.map((p) => {
      if (p.id !== projectId) return p;
      const exists = p.refs.some((r) => r.itemId === ref.itemId && r.tool === ref.tool);
      if (exists) return p;
      return {
        ...p,
        refs: [...p.refs, { ...ref, linkedAt: new Date().toISOString() }],
        updated_at: new Date().toISOString(),
      };
    });
    set({ projects });
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    const updated = get().projects.find(p => p.id === projectId);
    if (updated) upsertToSupabase('projects', updated);
  },

  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  getProject: (id) => get().projects.find((p) => p.id === id),

  getOrCreateProject: (name) => {
    const existing = get().projects.find((p) => p.name === name);
    if (existing) return existing.id;
    return get().createProject(name);
  },
}));
