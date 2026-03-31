// ─── Reframe (악보 해석 | 문제 재정의) ───

export interface ReframeHiddenQuestion {
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
  evaluation_reason?: string;
  axis?: 'customer_value' | 'feasibility' | 'business' | 'org_capacity';
}

/** @deprecated Kept for backward compatibility with old localStorage data */
export interface ReframeSubtask {
  task: string;
  actor: 'ai' | 'human' | 'both';
  actor_reasoning: string;
}

export interface ReframeAnalysis {
  surface_task: string;
  reframed_question: string;
  why_reframing_matters: string;
  reasoning_narrative: string;
  hidden_assumptions: HiddenAssumption[];
  hidden_questions: ReframeHiddenQuestion[];
  ai_limitations: string[];
  // Legacy fields — kept for backward compat with old data
  hypothesis?: string;
  alternative_framings?: string[];
  decomposition?: ReframeSubtask[];
}

export interface InterviewSignals {
  // v1 fields (legacy, backward compat)
  origin?: 'top-down' | 'external' | 'self' | 'fire';
  uncertainty?: 'why' | 'what' | 'how' | 'none';
  success?: 'measurable' | 'risk' | 'opportunity' | 'unclear';
  // v2 fields (Cynefin/Thompson-Tuden based)
  version?: 1 | 2;
  nature?: 'known_path' | 'needs_analysis' | 'no_answer' | 'on_fire';
  goal?: 'clear_goal' | 'direction_only' | 'competing' | 'unclear';
  stakes?: 'irreversible' | 'important' | 'experiment' | 'unknown_stakes';
  // v2 adaptive fields (conditional on core answers)
  trigger?: 'external_pressure' | 'internal_request' | 'opportunity' | 'recurring';
  history?: 'failed' | 'partial' | 'first' | 'unknown';
  stakeholder?: 'executive' | 'team' | 'client' | 'self';
}

export interface ReframeItem {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
  input_text: string;
  analysis: ReframeAnalysis | null;
  selected_question: string;
  final_decomposition?: ReframeSubtask[];
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

// ─── Recast (편곡 | 실행 설계) ───

/** Actor relationship: who initiates → who completes */
export type ActorRelationship = 'human' | 'ai' | 'human→ai' | 'ai→human' | 'both';

export interface RecastStep {
  task: string;
  actor: ActorRelationship;
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
  ai_scope?: string;
  human_scope?: string;
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

export interface RecastAnalysis {
  governing_idea: string;
  storyline: {
    situation: string;
    complication: string;
    resolution: string;
  };
  goal_summary: string;
  steps: RecastStep[];
  key_assumptions: KeyAssumption[];
  critical_path: number[];
  total_estimated_time: string;
  ai_ratio: number;
  human_ratio: number;
  design_rationale?: string;
  suggested_reviewers?: SuggestedReviewer[];
  reviews?: WorkflowReview[];
  previous_reviews?: WorkflowReview[];
  ai_limitation_warnings?: string[];
}

export interface SuggestedReviewer {
  name: string;
  role: string;
  influence: 'high' | 'medium' | 'low';
  decision_style: 'analytical' | 'intuitive' | 'consensus' | 'directive';
  risk_tolerance: 'low' | 'medium' | 'high';
  priorities: string;
  communication_style: string;
  known_concerns: string;
  success_metric: string;
  why_relevant: string;
}

export interface RecastItem {
  id: string;
  project_id?: string;
  loop_id?: string;
  iteration_number?: number;
  input_text: string;
  analysis: RecastAnalysis | null;
  steps: RecastStep[];
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
  decision_style?: 'analytical' | 'intuitive' | 'consensus' | 'directive';
  risk_tolerance?: 'low' | 'medium' | 'high';
  success_metric?: string;
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

export interface RehearsalResult {
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
  /** Phase 1: step-level translation of approval conditions */
  translated_approvals?: TranslatedApproval[];
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
  results: RehearsalResult[];
  synthesis: string;
  structured_synthesis?: StructuredSynthesis;
  discussion?: DiscussionMessage[];
  discussion_takeaway?: string;
  created_at: string;
}

// ─── Project ───

export interface ProjectRef {
  tool: 'reframe' | 'synthesize' | 'recast' | 'rehearse';
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
  /** Validation Chain: 완료 시 확신도 (1-5). outcome과 비교하여 보정 곡선 생성. */
  confidence_at_completion?: number;
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

export interface ReframeContext {
  surface_task: string;
  reframed_question: string;
  why_reframing_matters: string;
  selected_direction: string;
  unverified_assumptions: HiddenAssumption[];
  verified_assumptions: HiddenAssumption[];
  ai_limitations: string[];
  interview_signals?: InterviewSignals;
}

export interface RecastContext {
  governing_idea: string;
  storyline?: {
    situation: string;
    complication: string;
    resolution: string;
  };
  steps: RecastStep[];
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

export type PhaseContext = ReframeContext | RecastContext | RehearsalContext;

// ─── Handoff (transient, not persisted) ───

export interface Handoff {
  from: 'reframe' | 'synthesize' | 'recast' | 'rehearse' | 'refine' | 'workspace';
  fromItemId?: string;
  content?: string;
  projectId?: string;
  contextData?: PhaseContext;
  autoPersonaIds?: string[];
  data?: Record<string, unknown>;
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

// ─── Refine Loop ───

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

export interface RefineIteration {
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

export interface RefineLoop {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  original_plan: string;
  initial_feedback_record_id: string;
  initial_approval_conditions: ApprovalCondition[];
  persona_ids: string[];
  iterations: RefineIteration[];
  status: 'active' | 'converged' | 'stopped_by_user';
  max_iterations: number;
  created_at: string;
  updated_at: string;
}

// Legacy type kept for backward compatibility with existing data
export interface RefineIssue {
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

// ─── Quality Signals (Concertmaster's Journal) ───

export interface QualitySignal {
  id: string;
  project_id?: string;
  tool: 'reframe' | 'recast' | 'rehearse' | 'refine';
  signal_type: string;
  signal_data: Record<string, unknown>;
  created_at: string;
}

export interface LearningHealth {
  signal_count: number;
  eval_coverage: number;
  override_trend: 'improving' | 'stable' | 'not_enough_data';
  convergence_trend: 'improving' | 'stable' | 'not_enough_data';
  learning_tier: 1 | 2 | 3;
  recommendations: string[];
}

export interface RetrospectiveQuestion {
  id: string;
  category: 'process' | 'judgment' | 'learning';
  question: string;
  data_basis: string;
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
  phase: 'reframe' | 'recast' | 'rehearse';
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

// ─── Outcome Tracking (Phase 1) ───

export interface MaterializedRisk {
  risk_text: string;
  persona_id: string;
  category: 'critical' | 'manageable' | 'unspoken';
  actually_happened: boolean;
  impact_description?: string;
}

export interface ApprovalOutcome {
  condition: string;
  persona_id: string;
  met_in_reality: boolean;
  notes?: string;
}

export interface OutcomeRecord {
  id: string;
  project_id: string;
  hypothesis_result: 'confirmed' | 'partially_confirmed' | 'refuted' | 'not_testable';
  hypothesis_notes: string;
  materialized_risks: MaterializedRisk[];
  approval_outcomes: ApprovalOutcome[];
  overall_success: 'exceeded' | 'met' | 'partial' | 'failed';
  key_learnings: string;
  what_would_change: string;
  created_at: string;
}

// ─── Retrospective Answers (Phase 2) ───

export interface RetrospectiveAnswer {
  id: string;
  project_id: string;
  question_id: string;
  question_text: string;
  category: 'process' | 'judgment' | 'learning';
  answer: string;
  data_basis: string;
  created_at: string;
}

// ─── Decision Quality Score (Phase 3) ───

export interface DecisionQualityScore {
  id: string;
  project_id: string;
  appropriate_frame: number;
  creative_alternatives: number;
  relevant_information: number;
  clear_values: number;
  sound_reasoning: number;
  commitment_to_action: number;
  initial_framing_challenged: boolean;
  blind_spots_surfaced: number;
  user_changed_mind: boolean;
  overall_dq: number;
  created_at: string;
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

// ─── Judgment Vitality Engine ───
// "서로를 지탱함을 통해서 얻은 안정감과 체계화 때문에 이들은 경직되어 간다"
// Monitors whether the judgment process is alive (producing genuine novelty) or dead (performing compliance).

/** Tracks where an insight originated and how far it traveled */
export interface ProvenanceTag {
  phase: 'reframe' | 'recast' | 'rehearse' | 'refine';
  source_id: string;
  source_field: string;
  created_at: string;
}

/** Approval condition translated to specific plan elements */
export interface TranslatedApproval {
  persona_id: string;
  persona_name: string;
  influence: 'high' | 'medium' | 'low';
  condition: string;
  translated_to_plan: string | null;
  affected_steps: number[];
  met: boolean;
  met_at_iteration?: number;
}

/** Structural snapshot of a stage's output — used to measure γ (genuine novelty) */
export interface StageFingerprint {
  phase: 'reframe' | 'recast' | 'rehearse' | 'refine';
  item_id: string;
  timestamp: string;
  fingerprint: {
    // Reframe
    assumption_count?: number;
    assumption_axes?: string[];
    reframed_vs_surface_different?: boolean;
    // Recast
    step_count?: number;
    step_actors?: ActorRelationship[];
    checkpoint_count?: number;
    critical_path_length?: number;
    // Rehearsal
    risk_count?: number;
    critical_risk_count?: number;
    unspoken_risk_count?: number;
    approval_condition_count?: number;
    unique_concern_ratio?: number;
    // Refine
    iteration_count?: number;
    issues_resolved?: number;
    conditions_met_ratio?: number;
  };
}

export type RigidityCategory = 'user_ai' | 'user_persona' | 'user_system' | 'system_self';

export interface RigiditySignal {
  id: string;
  category: RigidityCategory;
  signal_type: string;
  severity: number;
  evidence: string;
  recommendation?: string;
}

/** Vitality = γ × (1 - rigidity). Alive or dead? */
export interface VitalityAssessment {
  id: string;
  project_id?: string;
  gamma: number;
  rigidity_score: number;
  vitality_score: number;
  signals: RigiditySignal[];
  fingerprints: StageFingerprint[];
  tier: 'alive' | 'coasting' | 'performing' | 'dead';
  created_at: string;
}

// ─── Progressive Flow (단일 프로그레시브 플로우) ───

export type ProgressivePhase =
  | 'input'           // 고민 입력 대기
  | 'analyzing'       // LLM 분석 중
  | 'conversing'      // Q&A 루프 (질문→답변→업데이트)
  | 'mixing'          // 최종 초안 조합 중
  | 'dm_feedback'     // 판단자 피드백 생성/표시
  | 'refining'        // 이슈 반영 선택
  | 'complete';       // 최종 산출물 완성

export interface FlowQuestion {
  id: string;
  text: string;
  subtext?: string;
  options?: string[];           // 선택형일 때
  type: 'select' | 'short';    // 선택 or 짧은 입력
  engine_phase: 'reframe' | 'recast';  // 어떤 엔진을 위한 질문인지
}

export interface FlowAnswer {
  question_id: string;
  value: string;
}

export interface AnalysisSnapshot {
  version: number;
  real_question: string;
  hidden_assumptions: string[];
  skeleton: string[];
  execution_plan?: {
    steps: { task: string; who: 'ai' | 'human' | 'both'; output: string }[];
    key_assumptions: string[];
  };
  insight?: string;              // 이번 업데이트의 핵심 인사이트
}

export interface DMConcern {
  text: string;
  severity: 'critical' | 'important' | 'minor';
  fix_suggestion: string;
  applied: boolean;
}

export interface DMFeedbackResult {
  persona_name: string;
  persona_role: string;
  first_reaction: string;
  good_parts: string[];
  concerns: DMConcern[];
  would_ask: string[];
  approval_condition: string;
}

export interface MixResult {
  title: string;
  executive_summary: string;
  sections: { heading: string; content: string }[];
  key_assumptions: string[];
  next_steps: string[];
}

export interface ProgressiveSession {
  id: string;
  project_id: string;
  problem_text: string;
  decision_maker: string | null;

  // Flow state
  phase: ProgressivePhase;
  round: number;                // 현재 Q&A 라운드 (0-based)
  max_rounds: number;           // 최대 라운드 (기본 3)

  // Accumulated data
  questions: FlowQuestion[];
  answers: FlowAnswer[];
  snapshots: AnalysisSnapshot[];  // version 0 = 초기, 1+ = 업데이트
  mix: MixResult | null;
  dm_feedback: DMFeedbackResult | null;

  // Final
  final_deliverable: string | null;

  // Engine refs (기존 store에도 저장)
  reframe_item_id?: string;
  recast_item_id?: string;
  feedback_record_id?: string;

  created_at: string;
  updated_at: string;
}
