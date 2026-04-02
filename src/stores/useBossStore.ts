import { create } from 'zustand';
import type { SajuProfile } from '@/lib/boss/saju-interpreter';
import type { PersonalityType } from '@/lib/boss/personality-types';
import { getPersonalityType } from '@/lib/boss/personality-types';

// ━━━ Types ━━━

export interface BossConfig {
  typeCode: string;
  gender: '남' | '여';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface BossState {
  // Setup
  axes: { ei: 'E' | 'I'; sn: 'S' | 'N'; tf: 'T' | 'F'; jp: 'J' | 'P' };
  gender: '남' | '여';
  birthYear: number;
  birthMonth: number;
  birthDay: number;

  // Saju (loaded from API)
  sajuProfile: SajuProfile | null;
  sajuLoading: boolean;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;

  // Phase: 'setup' → 'chat'
  phase: 'setup' | 'chat';

  // Actions
  setAxis: (key: 'ei' | 'sn' | 'tf' | 'jp', value: string) => void;
  setGender: (g: '남' | '여') => void;
  setBirth: (y: number, m: number, d: number) => void;
  loadSaju: () => Promise<void>;
  startChat: () => void;
  addUserMessage: (content: string) => void;
  setStreaming: (v: boolean) => void;
  updateStreamingText: (text: string) => void;
  commitAssistantMessage: () => void;
  getPersonalityType: () => PersonalityType | undefined;
  reset: () => void;
}

const INITIAL_STATE = {
  axes: { ei: 'E' as const, sn: 'S' as const, tf: 'T' as const, jp: 'J' as const },
  gender: '남' as const,
  birthYear: 1975,
  birthMonth: 1,
  birthDay: 1,
  sajuProfile: null,
  sajuLoading: false,
  messages: [] as ChatMessage[],
  isStreaming: false,
  streamingText: '',
  phase: 'setup' as const,
};

export const useBossStore = create<BossState>((set, get) => ({
  ...INITIAL_STATE,

  setAxis: (key, value) =>
    set((s) => ({ axes: { ...s.axes, [key]: value } })),

  setGender: (g) => set({ gender: g }),

  setBirth: (y, m, d) => set({ birthYear: y, birthMonth: m, birthDay: d }),

  loadSaju: async () => {
    const { birthYear, birthMonth, birthDay, gender } = get();
    set({ sajuLoading: true });
    try {
      const res = await fetch('/api/boss/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: birthYear,
          month: birthMonth,
          day: birthDay,
          gender,
        }),
      });
      if (res.ok) {
        const profile = await res.json();
        set({ sajuProfile: profile });
      }
    } catch {
      // Saju is optional — chat works without it
    } finally {
      set({ sajuLoading: false });
    }
  },

  startChat: () => set({ phase: 'chat' }),

  addUserMessage: (content) => {
    const msg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  setStreaming: (v) => set({ isStreaming: v, streamingText: v ? '' : get().streamingText }),

  updateStreamingText: (text) => set({ streamingText: text }),

  commitAssistantMessage: () => {
    const { streamingText } = get();
    if (!streamingText.trim()) return;
    const msg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: streamingText,
      timestamp: Date.now(),
    };
    set((s) => ({
      messages: [...s.messages, msg],
      streamingText: '',
      isStreaming: false,
    }));
  },

  getPersonalityType: () => {
    const { axes } = get();
    const code = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
    return getPersonalityType(code);
  },

  reset: () => set({ ...INITIAL_STATE }),
}));
