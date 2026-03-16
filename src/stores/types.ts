// ─── Decompose (과제 분해) ───

export interface DecomposeHiddenQuestion {
  question: string;
  reasoning: string;
  selected?: boolean;
  edited?: string;
}

export interface DecomposeSubtask {
  task: string;
  actor: 'ai' | 'human' | 'both';
  actor_reasoning: string;
}

export interface DecomposeAnalysis {
  surface_task: string;
  hidden_questions: DecomposeHiddenQuestion[];
  decomposition: DecomposeSubtask[];
  ai_limitations: string[];
}

export interface DecomposeItem {
  id: string;
  project_id?: string;
  input_text: string;
  analysis: DecomposeAnalysis | null;
  selected_question: string;
  final_decomposition: DecomposeSubtask[];
  status: 'input' | 'analyzing' | 'review' | 'done';
  created_at: string;
  updated_at: string;
}

// ─── Synthesize (산출물 합성) ───

export interface SynthesizeSource {
  name: string;
  content: string;
  extracted_claim?: string;
}

export interface SynthesizeConflict {
  id: string;
  topic: string;
  side_a: { source: string; position: string };
  side_b: { source: string; position: string };
  analysis: string;
  user_judgment?: string;
  user_reasoning?: string;
}

export interface SynthesizeAnalysis {
  sources_summary: { name: string; core_claim: string }[];
  agreements: string[];
  conflicts: SynthesizeConflict[];
  questions_for_user: string[];
}

export interface SynthesizeItem {
  id: string;
  project_id?: string;
  raw_input: string;
  sources: SynthesizeSource[];
  analysis: SynthesizeAnalysis | null;
  final_synthesis: string;
  status: 'input' | 'analyzing' | 'review' | 'done';
  created_at: string;
  updated_at: string;
}

// ─── Orchestrate (오케스트레이션 맵) ───

export interface OrchestrateStep {
  task: string;
  actor: 'ai' | 'human' | 'both';
  actor_reasoning: string;
  checkpoint: boolean;
  checkpoint_reason: string;
  estimated_time?: string;
  parallel_with?: number;
}

export interface OrchestrateAnalysis {
  goal_summary: string;
  steps: OrchestrateStep[];
  total_estimated_time: string;
  ai_ratio: number;
  human_ratio: number;
}

export interface OrchestrateItem {
  id: string;
  project_id?: string;
  input_text: string;
  analysis: OrchestrateAnalysis | null;
  steps: OrchestrateStep[];
  status: 'input' | 'analyzing' | 'review' | 'done';
  created_at: string;
  updated_at: string;
}

// ─── Persona ───

export interface FeedbackLog {
  id: string;
  date: string;
  context: string;
  feedback: string;
  created_at: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  organization: string;
  priorities: string;
  communication_style: string;
  known_concerns: string;
  relationship_notes: string;
  extracted_traits: string[];
  feedback_logs: FeedbackLog[];
  created_at: string;
  updated_at: string;
}

export interface PersonaFeedbackResult {
  persona_id: string;
  first_questions: string[];
  praise: string[];
  concerns: string[];
  wants_more: string[];
  overall_reaction: string;
}

export interface FeedbackRecord {
  id: string;
  project_id?: string;
  document_title: string;
  document_text: string;
  persona_ids: string[];
  feedback_perspective: string;
  feedback_intensity: string;
  results: PersonaFeedbackResult[];
  synthesis: string;
  created_at: string;
}

// ─── Project ───

export interface ProjectRef {
  tool: 'decompose' | 'synthesize' | 'orchestrate' | 'persona-feedback';
  itemId: string;
  label: string;
  linkedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  refs: ProjectRef[];
  created_at: string;
  updated_at: string;
}

// ─── Handoff (transient, not persisted) ───

export interface Handoff {
  from: 'decompose' | 'synthesize' | 'orchestrate' | 'persona-feedback';
  fromItemId: string;
  content: string;
  projectId?: string;
}

// ─── Judgment Record ───

export interface JudgmentRecord {
  id: string;
  type: 'hidden_question_selection' | 'conflict_resolution' | 'actor_override' | 'feedback_accuracy';
  context: string;
  decision: string;
  reasoning?: string;
  original_ai_suggestion: string;
  user_changed: boolean;
  project_id?: string;
  tool: string;
  created_at: string;
}

// ─── Settings ───

export type LLMMode = 'proxy' | 'direct' | 'local';

export interface Settings {
  anthropic_api_key: string;
  llm_mode: LLMMode;
  local_endpoint: string;
  language: 'ko' | 'en';
}
