// ─── Decompose (악보 해석 | 문제 재정의) ───

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
  hypothesis: string;
  alternative_framings: string[];
  hidden_assumptions: string[];
  hidden_questions: DecomposeHiddenQuestion[];
  decomposition: DecomposeSubtask[];
  ai_limitations: string[];
}

export interface DecomposeItem {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
  input_text: string;
  analysis: DecomposeAnalysis | null;
  selected_question: string;
  final_decomposition: DecomposeSubtask[];
  status: 'input' | 'analyzing' | 'review' | 'done';
  created_at: string;
  updated_at: string;
}

// ─── Synthesize (조율 — excluded from main flow) ───

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
  loop_id?: string;
  iteration_number?: number;
  raw_input: string;
  sources: SynthesizeSource[];
  analysis: SynthesizeAnalysis | null;
  final_synthesis: string;
  status: 'input' | 'analyzing' | 'review' | 'done';
  created_at: string;
  updated_at: string;
}

// ─── Orchestrate (편곡 | 실행 설계) ───

export interface OrchestrateStep {
  task: string;
  actor: 'ai' | 'human' | 'both';
  actor_reasoning: string;
  expected_output: string;
  judgment?: string;
  checkpoint: boolean;
  checkpoint_reason: string;
  estimated_time?: string;
  parallel_with?: number;
}

export interface KeyAssumption {
  assumption: string;
  importance: 'high' | 'medium' | 'low';
  certainty: 'high' | 'medium' | 'low';
  if_wrong: string;
}

export interface OrchestrateAnalysis {
  governing_idea: string;
  storyline: {
    situation: string;
    complication: string;
    resolution: string;
  };
  goal_summary: string;
  steps: OrchestrateStep[];
  key_assumptions: KeyAssumption[];
  critical_path: number[];
  total_estimated_time: string;
  ai_ratio: number;
  human_ratio: number;
}

export interface OrchestrateItem {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
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
  overall_reaction: string;
  failure_scenario: string;
  untested_assumptions: string[];
  first_questions: string[];
  praise: string[];
  concerns: string[];
  wants_more: string[];
  approval_conditions: string[];
}

export interface FeedbackRecord {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
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
  from: 'decompose' | 'synthesize' | 'orchestrate' | 'persona-feedback' | 'refinement-loop';
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

// ─── Refinement Loop ───

export interface RefinementIssue {
  id: string;
  source_persona_id: string;
  source_persona_name: string;
  category: 'concern' | 'question' | 'wants_more';
  text: string;
  resolved: boolean;
  resolved_at_iteration?: number;
}

export interface RefinementIteration {
  iteration_number: number;
  trigger_reason: string;
  issues_from_feedback: RefinementIssue[];
  constraints_added: string[];
  decompose_item_id?: string;
  orchestrate_item_id?: string;
  synthesize_item_id?: string;
  feedback_record_id?: string;
  delta_summary: string;
  unresolved_count: number;
  total_issue_count: number;
  convergence_score: number;
  created_at: string;
}

export interface RefinementLoop {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  iterations: RefinementIteration[];
  status: 'active' | 'converged' | 'stopped_by_user';
  max_iterations: number;
  convergence_threshold: number;
  created_at: string;
  updated_at: string;
}

// ─── Persona Accuracy ───

export interface PersonaAccuracyRating {
  id: string;
  feedback_record_id: string;
  persona_id: string;
  accuracy_score: number;
  accuracy_notes?: string;
  which_aspects_accurate: string[];
  which_aspects_inaccurate: string[];
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
