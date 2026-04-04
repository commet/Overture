import { create } from 'zustand';
import type { SajuProfile } from '@/lib/boss/saju-interpreter';
import type { PersonalityType } from '@/lib/boss/personality-types';
import { getPersonalityType } from '@/lib/boss/personality-types';
import { useAgentStore } from '@/stores/useAgentStore';
import type { Agent } from '@/stores/agent-types';

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

  // Agent 연동
  loadedAgentId: string | null;   // 저장된 boss agent를 불러왔을 때

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

  // Agent 연동 액션
  saveAsAgent: (name?: string) => string | null;
  loadBossFromAgent: (agentId: string) => void;
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
  loadedAgentId: null as string | null,
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

    // Agent XP 기록
    const { loadedAgentId } = get();
    if (loadedAgentId) {
      useAgentStore.getState().recordActivity(loadedAgentId, 'boss_chat', '대화');
    }
  },

  getPersonalityType: () => {
    const { axes } = get();
    const code = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
    return getPersonalityType(code);
  },

  reset: () => set({ ...INITIAL_STATE }),

  // ─── Agent 연동 ───

  saveAsAgent: (name) => {
    const { axes, gender, sajuProfile } = get();
    const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
    const personalityType = getPersonalityType(typeCode);
    if (!personalityType) return null;

    const agentStore = useAgentStore.getState();
    if (agentStore.agents.length === 0) agentStore.loadAgents();

    const agentId = agentStore.createBossAgent({
      name: name || `${personalityType.name} 팀장`,
      typeCode,
      gender,
      personalityProfile: {
        communicationStyle: personalityType.communicationStyle,
        decisionPattern: personalityType.decisionPattern,
        conflictStyle: personalityType.conflictStyle,
        feedbackStyle: personalityType.feedbackStyle,
        triggers: personalityType.triggers,
        speechPatterns: personalityType.speechPatterns,
        bossVibe: personalityType.bossVibe,
      },
      sajuProfile: sajuProfile ?? undefined,
    });

    set({ loadedAgentId: agentId });
    return agentId;
  },

  loadBossFromAgent: (agentId) => {
    const agentStore = useAgentStore.getState();
    if (agentStore.agents.length === 0) agentStore.loadAgents();

    const agent = agentStore.getAgent(agentId);
    if (!agent || !agent.personality_code) return;

    const code = agent.personality_code;
    set({
      axes: {
        ei: (code[0] as 'E' | 'I') || 'E',
        sn: (code[1] as 'S' | 'N') || 'S',
        tf: (code[2] as 'T' | 'F') || 'T',
        jp: (code[3] as 'J' | 'P') || 'J',
      },
      gender: agent.boss_gender || '남',
      sajuProfile: agent.saju_profile as SajuProfile | null,
      phase: 'chat',
      messages: [],
      loadedAgentId: agentId,
    });
  },
}));
