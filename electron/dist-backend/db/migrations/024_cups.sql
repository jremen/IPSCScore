-- Cups (league/season aggregates over existing matches)
CREATE TABLE IF NOT EXISTS cups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  scoring_mode VARCHAR(20) NOT NULL CHECK (scoring_mode IN ('hit_factor', 'points')),
  minimum_matches INT CHECK (minimum_matches IS NULL OR minimum_matches >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cup_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id UUID NOT NULL REFERENCES cups(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cup_id, match_id)
);
CREATE INDEX IF NOT EXISTS idx_cup_matches_cup ON cup_matches(cup_id);
CREATE INDEX IF NOT EXISTS idx_cup_matches_match ON cup_matches(match_id);