import { create } from 'zustand';
import type { Settings } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';

const DEFAULT_SETTINGS: Settings = {
  anthropic_api_key: '',
  openai_api_key: '',
  llm_provider: 'anthropic',
  llm_mode: 'proxy',
  local_endpoint: '',
  language: 'ko',
  audio_enabled: false,
  audio_volume: 0.15,
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
    if (settings.anthropic_api_key && settings.llm_mode === 'proxy' && (settings.llm_provider || 'anthropic') === 'anthropic') {
      settings.llm_mode = 'direct';
    }
    // OpenAI provider always uses direct mode
    if ((settings.llm_provider || 'anthropic') === 'openai') {
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
