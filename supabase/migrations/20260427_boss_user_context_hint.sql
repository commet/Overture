-- Boss "한 줄 더": optional one-line user-supplied hint about a saved boss.
--
-- Treated as a soft modulator in the LLM prompt — never as a defining trait
-- (see lib/boss/boss-prompt.ts buildHintSection). Stored as plain text so it
-- round-trips with the rest of the boss agent record.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS user_context_hint text;
