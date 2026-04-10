-- Progressive Sessions: Supabase persistence for multi-agent workflow sessions.
-- Stores full ProgressiveSession as JSONB for cross-device sync + human agent async support.

CREATE TABLE IF NOT EXISTS progressive_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  phase TEXT NOT NULL DEFAULT 'input',
  has_pending_humans BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users only see their own sessions
ALTER TABLE progressive_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progressive sessions"
  ON progressive_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_user ON progressive_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_pending ON progressive_sessions(has_pending_humans)
  WHERE has_pending_humans = TRUE;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_progressive_sessions_updated_at
  BEFORE UPDATE ON progressive_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Atomic worker update function — avoids JSONB read-modify-write race condition
-- Updates a single worker within the data.workers array by worker_id
CREATE OR REPLACE FUNCTION update_worker_response(
  p_session_id TEXT,
  p_worker_id TEXT,
  p_response TEXT,
  p_response_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
  v_idx INTEGER;
BEGIN
  -- Find the worker index in the JSONB array
  SELECT ordinality - 1 INTO v_idx
  FROM progressive_sessions,
       jsonb_array_elements(data->'workers') WITH ORDINALITY
  WHERE id = p_session_id
    AND value->>'id' = p_worker_id
  LIMIT 1;

  IF v_idx IS NOT NULL THEN
    UPDATE progressive_sessions
    SET data = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(data,
                ARRAY['workers', v_idx::text, 'status'], '"done"'::jsonb),
                ARRAY['workers', v_idx::text, 'result'], to_jsonb(p_response)),
                ARRAY['workers', v_idx::text, 'human_input'], to_jsonb(p_response)),
                ARRAY['workers', v_idx::text, 'response_at'], to_jsonb(p_response_at::text)),
                ARRAY['workers', v_idx::text, 'completed_at'], to_jsonb(p_response_at::text)),
                ARRAY['workers', v_idx::text, 'approved'], 'true'::jsonb),
        has_pending_humans = EXISTS (
          SELECT 1 FROM jsonb_array_elements(data->'workers') w
          WHERE w.value->>'agent_type' = 'human'
            AND w.value->>'status' IN ('sent', 'waiting_response')
            AND w.value->>'id' != p_worker_id
        ),
        updated_at = NOW()
    WHERE id = p_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── Human Agent Messages: tracks sent messages for reply matching ───

CREATE TABLE IF NOT EXISTS human_agent_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES progressive_sessions(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'email')),
  -- Slack fields
  thread_ts TEXT,
  channel_id TEXT,
  -- Email fields
  reply_token TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'responded', 'expired')),
  response_text TEXT,
  responded_at TIMESTAMPTZ,
  -- TTL: messages expire after 7 days if no response
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint: one message per worker per session
  UNIQUE (session_id, worker_id)
);

ALTER TABLE human_agent_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages (for UI display)
CREATE POLICY "Users see own human agent messages"
  ON human_agent_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can INSERT/UPDATE (API routes use service key)
-- RLS is bypassed by service role key, so no explicit INSERT/UPDATE policy needed
-- The SELECT policy above restricts anon-key access to own rows only

CREATE INDEX IF NOT EXISTS idx_ham_thread ON human_agent_messages(thread_ts) WHERE channel = 'slack';
CREATE INDEX IF NOT EXISTS idx_ham_token ON human_agent_messages(reply_token) WHERE channel = 'email';
CREATE INDEX IF NOT EXISTS idx_ham_status ON human_agent_messages(status) WHERE status = 'sent';
