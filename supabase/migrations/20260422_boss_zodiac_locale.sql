-- Boss globalization: add zodiac + locale + day of birth
--
-- Enables English-locale Boss personas backed by Western zodiac + Chinese
-- zodiac (instead of Korean Saju). `boss_locale` tracks which locale the
-- boss was created in so prompts/display branch correctly even if the
-- user's UI locale later changes.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS birth_day integer,
  ADD COLUMN IF NOT EXISTS zodiac_profile jsonb,
  ADD COLUMN IF NOT EXISTS boss_locale text CHECK (boss_locale IN ('ko','en'));
