import { create } from 'zustand';
import type { Persona, FeedbackLog, FeedbackRecord, PersonaFeedbackResult } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, deleteFromSupabase, loadAndMerge, insertToSupabase } from '@/lib/db';

interface PersonaState {
  personas: Persona[];
  feedbackHistory: FeedbackRecord[];
  loadData: () => void;
  createPersona: (data: Partial<Persona>) => string;
  updatePersona: (id: string, data: Partial<Persona>) => void;
  deletePersona: (id: string) => void;
  addFeedbackLog: (personaId: string, log: Omit<FeedbackLog, 'id' | 'created_at'>) => void;
  deleteFeedbackLog: (personaId: string, logId: string) => void;
  addFeedbackRecord: (record: Omit<FeedbackRecord, 'id' | 'created_at'>) => string;
  getPersona: (id: string) => Persona | undefined;
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  personas: [],
  feedbackHistory: [],

  loadData: () => {
    const localPersonas = getStorage<Persona[]>(STORAGE_KEYS.PERSONAS, []);
    const localFeedback = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, []);
    set({ personas: localPersonas, feedbackHistory: localFeedback });
    loadAndMerge<Persona>('personas', STORAGE_KEYS.PERSONAS)
      .then((merged) => set({ personas: merged }));
    loadAndMerge<FeedbackRecord>('feedback_records', STORAGE_KEYS.FEEDBACK_HISTORY)
      .then((merged) => set({ feedbackHistory: merged }));
  },

  createPersona: (data) => {
    const now = new Date().toISOString();
    const newPersona: Persona = {
      id: generateId(),
      name: data.name || '',
      role: data.role || '',
      organization: data.organization || '',
      priorities: data.priorities || '',
      communication_style: data.communication_style || '',
      known_concerns: data.known_concerns || '',
      relationship_notes: data.relationship_notes || '',
      influence: data.influence || 'medium',
      extracted_traits: data.extracted_traits || [],
      feedback_logs: [],
      created_at: now,
      updated_at: now,
    };
    const personas = [...get().personas, newPersona];
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    upsertToSupabase('personas', newPersona);
    return newPersona.id;
  },

  updatePersona: (id, data) => {
    const personas = get().personas.map((p) =>
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    );
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    const updated = get().personas.find(p => p.id === id);
    if (updated) upsertToSupabase('personas', updated);
  },

  deletePersona: (id) => {
    const personas = get().personas.filter((p) => p.id !== id);
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    deleteFromSupabase('personas', id);
  },

  addFeedbackLog: (personaId, log) => {
    const personas = get().personas.map((p) => {
      if (p.id !== personaId) return p;
      return {
        ...p,
        feedback_logs: [...p.feedback_logs, { ...log, id: generateId(), created_at: new Date().toISOString() }],
        updated_at: new Date().toISOString(),
      };
    });
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    const updated = get().personas.find(p => p.id === personaId);
    if (updated) upsertToSupabase('personas', updated);
  },

  deleteFeedbackLog: (personaId, logId) => {
    const personas = get().personas.map((p) => {
      if (p.id !== personaId) return p;
      return { ...p, feedback_logs: p.feedback_logs.filter((l) => l.id !== logId), updated_at: new Date().toISOString() };
    });
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    const updated = get().personas.find(p => p.id === personaId);
    if (updated) upsertToSupabase('personas', updated);
  },

  addFeedbackRecord: (record) => {
    const id = generateId();
    const newRecord: FeedbackRecord = { ...record, id, created_at: new Date().toISOString() };
    const feedbackHistory = [...get().feedbackHistory, newRecord];
    set({ feedbackHistory });
    setStorage(STORAGE_KEYS.FEEDBACK_HISTORY, feedbackHistory);
    insertToSupabase('feedback_records', newRecord);
    return id;
  },

  getPersona: (id) => get().personas.find((p) => p.id === id),
}));
