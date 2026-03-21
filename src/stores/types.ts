// ─── Decompose (악보 해석 | 문제 재정의) ───

export interface DecomposeHiddenQuestion {
  question: string;
  reasoning: string;
  selected?: boolean;
  edited?: string;
  source_assumption?: string;
}

export interface HiddenAssumption {
  assumption: string;
  risk_if_false: string;
  verified?: boolean;
  evaluation?: 'likely_true' | 'uncertain' | 'doubtful';
}

/** @deprecated Kept for backward compatibility with old localStorage data */
export interface DecomposeSubtask {
  task: string;
  actor: 'ai' | 'human' | 'both';
  actor_reasoning: string;
}

export interface DecomposeAnalysis {
  surface_task: string;
  reframed_question: string;
  why_reframing_matters: string;
  reasoning_narrative: string;
  hidden_assumptions: HiddenAssumption[];
  hidden_questions: DecomposeHiddenQuestion[];
  ai_limitations: string[];
  // Legacy fields — kept for backward compat with old data
  hypothesis?: string;
  alternative_framings?: string[];
  decomposition?: DecomposeSubtask[];
}

export interface InterviewSignals {
  origin?: 'top-down' | 'external' | 'self' | 'fire';
  uncertainty?: 'why' | 'what' | 'how' | 'none';
  success?: 'measurable' | 'risk' | 'opportunity' | 'unclear';
}

export interface DecomposeItem {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
  input_text: string;
  analysis: DecomposeAnalysis | null;
  selected_question: string;
  final_decomposition?: DecomposeSubtask[];
  status: 'input' | 'analyzing' | 'review' | 'done';
  user_edited_question?: boolean;
  reanalysis_count?: number;
  interview_signals?: InterviewSignals;
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
  user_ai_guide?: string;
  user_decision?: string;
  ai_direction_options?: string[];
}

export interface KeyAssumption {
  assumption: string;
  importance: 'high' | 'medium' | 'low';
  certainty: 'high' | 'medium' | 'low';
  if_wrong: string;
}

export interface ReviewFinding {
  type: 'gap' | 'suggestion' | 'risk' | 'opportunity';
  severity: 'high' | 'medium' | 'low';
  text: string;
  affected_steps?: number[];
}

export interface WorkflowReview {
  lens: string;
  lens_label: string;
  findings: ReviewFinding[];
  reviewed_at: string;
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
  design_rationale?: string;
  reviews?: WorkflowReview[];
  previous_reviews?: WorkflowReview[];
  ai_limitation_warnings?: string[];
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
  influence: 'high' | 'medium' | 'low';
  extracted_traits: string[];
  feedback_logs: FeedbackLog[];
  is_example?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassifiedRisk {
  text: string;
  category: 'critical' | 'manageable' | 'unspoken';
}

export interface PersonaFeedbackResult {
  persona_id: string;
  overall_reaction: string;
  failure_scenario: string;
  untested_assumptions: string[];
  classified_risks: ClassifiedRisk[];
  first_questions: string[];
  praise: string[];
  concerns: string[];
  wants_more: string[];
  approval_conditions: string[];
}

export interface DiscussionMessage {
  persona_id: string;
  message: string;
  reacting_to?: string;
  type: 'agreement' | 'disagreement' | 'elaboration' | 'question';
}

export interface StructuredSynthesis {
  common_agreements: string[];
  key_conflicts: Array<{
    topic: string;
    positions: Array<{ persona_id: string; stance: string }>;
  }>;
  priority_actions: Array<{
    action: string;
    requested_by: string;
    priority: 'high' | 'medium';
  }>;
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
  structured_synthesis?: StructuredSynthesis;
  discussion?: DiscussionMessage[];
  discussion_takeaway?: string;
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
  meta_reflection?: MetaReflection;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── Coda: 공연 후 성찰 ───

export interface MetaReflection {
  understanding_change?: string;
  surprising_discovery?: string;
  next_time_differently?: string;
  created_at: string;
}

// ─── Context Chain (Phase 0: 타입드 맥락 파이프라인) ───

export interface DecomposeContext {
  surface_task: string;
  reframed_question: string;
  why_reframing_matters: string;
  selected_direction: string;
  unverified_assumptions: HiddenAssumption[];
  verified_assumptions: HiddenAssumption[];
  ai_limitations: string[];
  interview_signals?: {
    origin?: string;
    uncertainty?: string;
    success?: string;
  };
}

export interface OrchestrateContext {
  governing_idea: string;
  storyline?: {
    situation: string;
    complication: string;
    resolution: string;
  };
  steps: OrchestrateStep[];
  key_assumptions: KeyAssumption[];
  critical_path: number[];
  design_rationale?: string;
}

export interface RehearsalContext {
  classified_risks: ClassifiedRisk[];
  untested_assumptions: string[];
  approval_conditions: Record<string, string[]>;
  failure_scenarios: string[];
}

export type PhaseContext = DecomposeContext | OrchestrateContext | RehearsalContext;

// ─── Handoff (transient, not persisted) ───

export interface Handoff {
  from: 'decompose' | 'synthesize' | 'orchestrate' | 'persona-feedback' | 'refinement-loop';
  fromItemId: string;
  content: string;
  projectId?: string;
  contextData?: PhaseContext;
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

export interface ApprovalCondition {
  persona_id: string;
  persona_name: string;
  influence: 'high' | 'medium' | 'low';
  condition: string;
  met: boolean;
  met_at_iteration?: number;
}

export interface RevisionChange {
  what: string;
  why: string;
  addressing: string;
}

export interface IterationConvergence {
  critical_risks: number;
  total_issues: number;
  approval_conditions: ApprovalCondition[];
}

export interface RefinementIteration {
  iteration_number: number;
  issues_to_address: string[];
  user_directive?: string;
  revised_plan: string;
  changes: RevisionChange[];
  not_addressed?: string[];
  feedback_record_id: string;
  convergence: IterationConvergence;
  created_at: string;
}

export interface RefinementLoop {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  original_plan: string;
  initial_feedback_record_id: string;
  initial_approval_conditions: ApprovalCondition[];
  persona_ids: string[];
  iterations: RefinementIteration[];
  status: 'active' | 'converged' | 'stopped_by_user';
  max_iterations: number;
  created_at: string;
  updated_at: string;
}

// Legacy type kept for backward compatibility with existing data
export interface RefinementIssue {
  id: string;
  source_persona_id: string;
  source_persona_name: string;
  category: 'concern' | 'question' | 'wants_more';
  severity: 'blocker' | 'improvement' | 'nice_to_have';
  text: string;
  resolved: boolean;
  resolved_at_iteration?: number;
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

// ─── Team Collaboration ───

export interface Team {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  // Joined from auth (client-side only)
  email?: string;
  display_name?: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface TeamReviewInput {
  id: string;
  project_id: string;
  user_id: string;
  phase: 'decompose' | 'orchestrate' | 'rehearsal';
  target_type: 'assumption' | 'step' | 'risk' | 'direction' | 'general';
  target_id: string | null;
  input_type: 'rating' | 'concern' | 'endorsement' | 'alternative';
  rating: number | null;
  comment: string | null;
  visible: boolean;
  created_at: string;
  // Client-side only
  user_name?: string;
}

// ─── Settings ───

export type LLMMode = 'proxy' | 'direct' | 'local';

export interface Settings {
  anthropic_api_key: string;
  llm_mode: LLMMode;
  local_endpoint: string;
  language: 'ko' | 'en';
  audio_enabled: boolean;
  audio_volume: number;
}
