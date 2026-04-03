-- ═══════════════════════════════════════════════════
-- 통합 에이전트 시스템 — Supabase 마이그레이션
-- 2026-04-03
-- ═══════════════════════════════════════════════════

-- ─── agents ───

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '👤',
  color TEXT NOT NULL DEFAULT '#6B7280',
  origin TEXT NOT NULL DEFAULT 'custom',
  capabilities TEXT[] NOT NULL DEFAULT '{}',

  -- 소속
  "group" TEXT NOT NULL DEFAULT 'people',
  chain_id TEXT,
  unlock_condition JSONB NOT NULL DEFAULT '{"type":"always","required":0}',
  unlocked BOOLEAN NOT NULL DEFAULT true,

  -- Worker traits
  expertise TEXT,
  tone TEXT,
  keywords TEXT[],

  -- Stakeholder traits
  organization TEXT,
  priorities TEXT,
  communication_style TEXT,
  known_concerns TEXT,
  relationship_notes TEXT,
  influence TEXT,
  decision_style TEXT,
  risk_tolerance TEXT,
  success_metric TEXT,
  extracted_traits TEXT[],
  feedback_logs JSONB DEFAULT '[]',

  -- Boss traits
  personality_code TEXT,
  personality_profile JSONB,
  boss_gender TEXT,
  saju_profile JSONB,

  -- Growth
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  observations JSONB NOT NULL DEFAULT '[]',

  -- Meta
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  is_example BOOLEAN DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_group ON agents(user_id, "group");

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_own" ON agents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agents_insert_own" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_update_own" ON agents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agents_delete_own" ON agents
  FOR DELETE USING (auth.uid() = user_id);

-- ─── agent_chains ───

CREATE TABLE IF NOT EXISTS agent_chains (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_ids TEXT[] NOT NULL DEFAULT '{}',
  total_tasks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

ALTER TABLE agent_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_chains_select_own" ON agent_chains
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_chains_insert_own" ON agent_chains
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_chains_update_own" ON agent_chains
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_chains_delete_own" ON agent_chains
  FOR DELETE USING (auth.uid() = user_id);

-- ─── agent_activities ───

CREATE TABLE IF NOT EXISTS agent_activities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  context TEXT,
  session_id TEXT,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_agent ON agent_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_user ON agent_activities(user_id);

ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_activities_select_own" ON agent_activities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_activities_insert_own" ON agent_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_activities_delete_own" ON agent_activities
  FOR DELETE USING (auth.uid() = user_id);

-- ─── updated_at trigger ───

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_agent_chains_updated_at
  BEFORE UPDATE ON agent_chains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
