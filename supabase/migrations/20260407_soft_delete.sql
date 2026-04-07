-- Soft delete: deleted_at 컬럼 추가
-- localStorage에서는 즉시 제거, Supabase에만 deleted_at 보존 (복구용)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE reframe_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE recast_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE refine_loops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Partial index: active (non-deleted) 항목만 빠르게 조회
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_personas_active ON personas(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reframe_active ON reframe_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recast_active ON recast_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refine_active ON refine_loops(user_id) WHERE deleted_at IS NULL;

-- Synthesize items 테이블 (기존에 없었음 — soft delete 포함하여 생성)
CREATE TABLE IF NOT EXISTS synthesize_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id TEXT,
  raw_input TEXT NOT NULL DEFAULT '',
  sources JSONB NOT NULL DEFAULT '[]',
  analysis JSONB,
  final_synthesis TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'input',
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE synthesize_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own synthesize items" ON synthesize_items
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_synthesize_active ON synthesize_items(user_id) WHERE deleted_at IS NULL;

-- updated_at 자동 트리거
CREATE OR REPLACE TRIGGER set_synthesize_items_updated_at
  BEFORE UPDATE ON synthesize_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
