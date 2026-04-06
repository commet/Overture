-- ═══════════════════════════════════════════════════
-- 코어 테이블 — Supabase 마이그레이션
-- 2026-04-07
--
-- 12 tables referenced in db.ts that were missing migrations:
-- projects, personas, reframe_items, recast_items,
-- feedback_records, judgment_records, accuracy_ratings,
-- refine_loops, quality_signals, outcome_records,
-- retrospective_answers, decision_quality_scores
-- ═══════════════════════════════════════════════════

-- ─── projects ───

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  refs JSONB NOT NULL DEFAULT '[]',
  meta_reflection JSONB,
  confidence_at_completion INTEGER,
  team_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ─── personas ───

CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  role TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  priorities TEXT NOT NULL DEFAULT '',
  communication_style TEXT NOT NULL DEFAULT '',
  known_concerns TEXT NOT NULL DEFAULT '',
  relationship_notes TEXT NOT NULL DEFAULT '',
  influence TEXT NOT NULL DEFAULT 'medium',
  decision_style TEXT,
  risk_tolerance TEXT,
  success_metric TEXT,
  extracted_traits JSONB NOT NULL DEFAULT '[]',
  feedback_logs JSONB NOT NULL DEFAULT '[]',
  is_example BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_user ON personas(user_id);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personas_select_own" ON personas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "personas_insert_own" ON personas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "personas_update_own" ON personas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "personas_delete_own" ON personas
  FOR DELETE USING (auth.uid() = user_id);

-- ─── reframe_items ───

CREATE TABLE IF NOT EXISTS reframe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT,
  loop_id TEXT,
  iteration_number INTEGER,
  input_text TEXT NOT NULL,
  analysis JSONB,
  selected_question TEXT NOT NULL DEFAULT '',
  final_decomposition JSONB,
  status TEXT NOT NULL DEFAULT 'input',
  user_edited_question BOOLEAN,
  reanalysis_count INTEGER,
  interview_signals JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reframe_items_user ON reframe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_reframe_items_project ON reframe_items(user_id, project_id);

ALTER TABLE reframe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reframe_items_select_own" ON reframe_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reframe_items_insert_own" ON reframe_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reframe_items_update_own" ON reframe_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reframe_items_delete_own" ON reframe_items
  FOR DELETE USING (auth.uid() = user_id);

-- ─── recast_items ───

CREATE TABLE IF NOT EXISTS recast_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT,
  loop_id TEXT,
  iteration_number INTEGER,
  input_text TEXT NOT NULL,
  analysis JSONB,
  steps JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'input',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recast_items_user ON recast_items(user_id);
CREATE INDEX IF NOT EXISTS idx_recast_items_project ON recast_items(user_id, project_id);

ALTER TABLE recast_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recast_items_select_own" ON recast_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recast_items_insert_own" ON recast_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recast_items_update_own" ON recast_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recast_items_delete_own" ON recast_items
  FOR DELETE USING (auth.uid() = user_id);

-- ─── feedback_records ───

CREATE TABLE IF NOT EXISTS feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT,
  loop_id TEXT,
  iteration_number INTEGER,
  document_title TEXT NOT NULL DEFAULT '',
  document_text TEXT NOT NULL DEFAULT '',
  persona_ids JSONB NOT NULL DEFAULT '[]',
  feedback_perspective TEXT NOT NULL DEFAULT '',
  feedback_intensity TEXT NOT NULL DEFAULT '',
  results JSONB NOT NULL DEFAULT '[]',
  synthesis TEXT NOT NULL DEFAULT '',
  structured_synthesis JSONB,
  discussion JSONB,
  discussion_takeaway TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_records_user ON feedback_records(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_records_project ON feedback_records(user_id, project_id);

ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_records_select_own" ON feedback_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "feedback_records_insert_own" ON feedback_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback_records_update_own" ON feedback_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "feedback_records_delete_own" ON feedback_records
  FOR DELETE USING (auth.uid() = user_id);

-- ─── judgment_records ───

CREATE TABLE IF NOT EXISTS judgment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',
  reasoning TEXT,
  original_ai_suggestion TEXT NOT NULL DEFAULT '',
  user_changed BOOLEAN NOT NULL DEFAULT false,
  project_id TEXT,
  tool TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judgment_records_user ON judgment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_judgment_records_project ON judgment_records(user_id, project_id);

ALTER TABLE judgment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "judgment_records_select_own" ON judgment_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "judgment_records_insert_own" ON judgment_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "judgment_records_update_own" ON judgment_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "judgment_records_delete_own" ON judgment_records
  FOR DELETE USING (auth.uid() = user_id);

-- ─── accuracy_ratings ───

CREATE TABLE IF NOT EXISTS accuracy_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  feedback_record_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  accuracy_score INTEGER NOT NULL,
  accuracy_notes TEXT,
  which_aspects_accurate JSONB NOT NULL DEFAULT '[]',
  which_aspects_inaccurate JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accuracy_ratings_user ON accuracy_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_ratings_feedback ON accuracy_ratings(feedback_record_id);

ALTER TABLE accuracy_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accuracy_ratings_select_own" ON accuracy_ratings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accuracy_ratings_insert_own" ON accuracy_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accuracy_ratings_update_own" ON accuracy_ratings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accuracy_ratings_delete_own" ON accuracy_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- ─── refine_loops ───

CREATE TABLE IF NOT EXISTS refine_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  original_plan TEXT NOT NULL DEFAULT '',
  initial_feedback_record_id TEXT NOT NULL,
  initial_approval_conditions JSONB NOT NULL DEFAULT '[]',
  persona_ids JSONB NOT NULL DEFAULT '[]',
  iterations JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  max_iterations INTEGER NOT NULL DEFAULT 3,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refine_loops_user ON refine_loops(user_id);
CREATE INDEX IF NOT EXISTS idx_refine_loops_project ON refine_loops(user_id, project_id);

ALTER TABLE refine_loops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refine_loops_select_own" ON refine_loops
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "refine_loops_insert_own" ON refine_loops
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "refine_loops_update_own" ON refine_loops
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "refine_loops_delete_own" ON refine_loops
  FOR DELETE USING (auth.uid() = user_id);

-- ─── quality_signals ───

CREATE TABLE IF NOT EXISTS quality_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT,
  tool TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_signals_user ON quality_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_signals_project ON quality_signals(user_id, project_id);

ALTER TABLE quality_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_signals_select_own" ON quality_signals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quality_signals_insert_own" ON quality_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quality_signals_update_own" ON quality_signals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quality_signals_delete_own" ON quality_signals
  FOR DELETE USING (auth.uid() = user_id);

-- ─── outcome_records ───

CREATE TABLE IF NOT EXISTS outcome_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT NOT NULL,
  hypothesis_result TEXT NOT NULL,
  hypothesis_notes TEXT NOT NULL DEFAULT '',
  materialized_risks JSONB NOT NULL DEFAULT '[]',
  approval_outcomes JSONB NOT NULL DEFAULT '[]',
  overall_success TEXT NOT NULL,
  key_learnings TEXT NOT NULL DEFAULT '',
  what_would_change TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_records_user ON outcome_records(user_id);
CREATE INDEX IF NOT EXISTS idx_outcome_records_project ON outcome_records(user_id, project_id);

ALTER TABLE outcome_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcome_records_select_own" ON outcome_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outcome_records_insert_own" ON outcome_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outcome_records_update_own" ON outcome_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outcome_records_delete_own" ON outcome_records
  FOR DELETE USING (auth.uid() = user_id);

-- ─── retrospective_answers ───

CREATE TABLE IF NOT EXISTS retrospective_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  data_basis TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrospective_answers_user ON retrospective_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_retrospective_answers_project ON retrospective_answers(user_id, project_id);

ALTER TABLE retrospective_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retrospective_answers_select_own" ON retrospective_answers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "retrospective_answers_insert_own" ON retrospective_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "retrospective_answers_update_own" ON retrospective_answers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "retrospective_answers_delete_own" ON retrospective_answers
  FOR DELETE USING (auth.uid() = user_id);

-- ─── decision_quality_scores ───

CREATE TABLE IF NOT EXISTS decision_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  project_id TEXT NOT NULL,
  appropriate_frame INTEGER NOT NULL,
  creative_alternatives INTEGER NOT NULL,
  relevant_information INTEGER NOT NULL,
  clear_values INTEGER NOT NULL,
  sound_reasoning INTEGER NOT NULL,
  commitment_to_action INTEGER NOT NULL,
  initial_framing_challenged BOOLEAN NOT NULL DEFAULT false,
  blind_spots_surfaced INTEGER NOT NULL DEFAULT 0,
  user_changed_mind BOOLEAN NOT NULL DEFAULT false,
  overall_dq REAL NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dq_scores_user ON decision_quality_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_dq_scores_project ON decision_quality_scores(user_id, project_id);

ALTER TABLE decision_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dq_scores_select_own" ON decision_quality_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dq_scores_insert_own" ON decision_quality_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dq_scores_update_own" ON decision_quality_scores
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dq_scores_delete_own" ON decision_quality_scores
  FOR DELETE USING (auth.uid() = user_id);

-- ─── updated_at triggers for tables with updated_at ───
-- (Reuses update_updated_at_column() function from 20260403_agents.sql)

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_reframe_items_updated_at
  BEFORE UPDATE ON reframe_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_recast_items_updated_at
  BEFORE UPDATE ON recast_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_refine_loops_updated_at
  BEFORE UPDATE ON refine_loops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
