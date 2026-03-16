import { create } from 'zustand';
import type { Settings } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';

const DEFAULT_SETTINGS: Settings = {
  anthropic_api_key: '',
  llm_mode: 'proxy',
  local_endpoint: '',
  language: 'ko',
};

interface SettingsState {
  settings: Settings;
  loadSettings: () => void;
  updateSettings: (data: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  loadSettings: () => {
    const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    // auto-detect mode based on saved api key
    if (settings.anthropic_api_key && settings.llm_mode === 'proxy') {
      settings.llm_mode = 'direct';
    }
    set({ settings });
  },

  updateSettings: (data) => {
    const settings = { ...get().settings, ...data };
    set({ settings });
    setStorage(STORAGE_KEYS.SETTINGS, settings);
  },
}));
