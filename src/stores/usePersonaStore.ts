import { create } from 'zustand';
import type { Persona, FeedbackLog, FeedbackRecord, RehearsalResult } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, deleteFromSupabase, loadAndMerge, insertToSupabase } from '@/lib/db';
import { track } from '@/lib/analytics';

const DEFAULT_PERSONAS: Omit<Persona, 'id' | 'created_at' | 'updated_at' | 'feedback_logs'>[] = [
  {
    name: '최진우 대표',
    role: 'CEO',
    organization: '',
    priorities: '비전과 전략 방향, 스토리라인의 전체 정합성, "그래서 한 마디로 뭔데?"',
    communication_style: '큰 그림부터 듣고 싶어함. 디테일보다 So What을 먼저 찾음. 내러티브가 없으면 관심을 잃음.',
    known_concerns: '전략적 방향성과 시장 포지셔닝, 이사회/투자자에게 설명 가능한 스토리',
    relationship_notes: '',
    influence: 'high',
    decision_style: 'intuitive',
    risk_tolerance: 'high',
    success_metric: '이사회에 설명 가능한 스토리와 핵심 방향 1줄',
    extracted_traits: ['스토리 중심', '큰 그림 우선', 'So What 집착', '직관적 판단'],
    is_example: true,
  },
  {
    name: '박서연 실장',
    role: '사업기획실장',
    organization: '',
    priorities: '상위 가이드라인 부합 여부, 보고 라인 정렬, 리스크 사전 차단',
    communication_style: '"본부장님이 지난번에 말씀하신 방향이랑 맞나요?" 가 입버릇. 정치적 감각이 있고 보고 라인을 빠짐없이 챙김.',
    known_concerns: '상사의 기존 방침과의 충돌, 조직 내 합의 부족, 프로세스 누락',
    relationship_notes: '',
    influence: 'high',
    decision_style: 'consensus',
    risk_tolerance: 'low',
    success_metric: '상위 가이드라인과 100% 정렬 + 보고 라인 사전 동의',
    extracted_traits: ['가이드라인 준수', '보고 라인 민감', '리스크 회피', '정치적 감각'],
    is_example: true,
  },
  {
    name: '김도현 팀장',
    role: '데이터분석팀장',
    organization: '',
    priorities: '숫자와 데이터의 정합성, 정량적 근거, 출처 명시',
    communication_style: '"근거 자료 있어요?" 가 입버릇. 표와 수치가 없으면 넘어가지 않음. 감이나 추정을 싫어함.',
    known_concerns: '데이터 없는 주장, 숫자 간 불일치, 출처 불명확한 통계',
    relationship_notes: '',
    influence: 'medium',
    decision_style: 'analytical',
    risk_tolerance: 'low',
    success_metric: '모든 수치의 출처와 정합성 확인',
    extracted_traits: ['숫자 집착', '근거 요구', '정합성 검증', '꼼꼼함'],
    is_example: true,
  },
];

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
  updateFeedbackRecord: (id: string, data: Partial<FeedbackRecord>) => void;
  getPersona: (id: string) => Persona | undefined;
  seedDefaultPersonas: () => void;
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
      id: data.id || generateId(),
      name: data.name || '',
      role: data.role || '',
      organization: data.organization || '',
      priorities: data.priorities || '',
      communication_style: data.communication_style || '',
      known_concerns: data.known_concerns || '',
      relationship_notes: data.relationship_notes || '',
      influence: data.influence || 'medium',
      decision_style: data.decision_style,
      risk_tolerance: data.risk_tolerance,
      success_metric: data.success_metric,
      extracted_traits: data.extracted_traits || [],
      feedback_logs: [],
      is_example: data.is_example,
      created_at: now,
      updated_at: now,
    };
    const personas = [...get().personas, newPersona];
    set({ personas });
    setStorage(STORAGE_KEYS.PERSONAS, personas);
    upsertToSupabase('personas', newPersona);
    track('persona_created', { influence: newPersona.influence, has_traits: newPersona.extracted_traits.length > 0 });
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

  updateFeedbackRecord: (id, data) => {
    const feedbackHistory = get().feedbackHistory.map(r =>
      r.id === id ? { ...r, ...data } : r
    );
    set({ feedbackHistory });
    setStorage(STORAGE_KEYS.FEEDBACK_HISTORY, feedbackHistory);
    const updated = feedbackHistory.find(r => r.id === id);
    if (updated) upsertToSupabase('feedback_records', updated);
  },

  getPersona: (id) => get().personas.find((p) => p.id === id),

  seedDefaultPersonas: () => {
    if (get().personas.length > 0) return;
    const now = new Date().toISOString();
    const seeded: Persona[] = DEFAULT_PERSONAS.map((d) => ({
      ...d,
      id: generateId(),
      feedback_logs: [],
      created_at: now,
      updated_at: now,
    }));
    set({ personas: seeded });
    setStorage(STORAGE_KEYS.PERSONAS, seeded);
    for (const p of seeded) upsertToSupabase('personas', p);
  },
}));
