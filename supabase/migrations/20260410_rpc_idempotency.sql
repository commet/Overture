-- Add idempotency guard to update_worker_response RPC.
-- If the worker is already 'done', skip the update entirely.
-- Prevents timestamp drift on duplicate webhook deliveries.

CREATE OR REPLACE FUNCTION update_worker_response(
  p_session_id TEXT,
  p_worker_id TEXT,
  p_response TEXT,
  p_response_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS VOID AS $$
DECLARE
  v_idx INTEGER;
  v_current_status TEXT;
BEGIN
  -- Find the worker index in the JSONB array
  SELECT ordinality - 1, value->>'status'
  INTO v_idx, v_current_status
  FROM progressive_sessions,
       jsonb_array_elements(data->'workers') WITH ORDINALITY
  WHERE id = p_session_id
    AND value->>'id' = p_worker_id
  LIMIT 1;

  -- Skip if worker not found or already done (idempotency guard)
  IF v_idx IS NULL OR v_current_status = 'done' THEN
    RETURN;
  END IF;

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
END;
$$ LANGUAGE plpgsql;
