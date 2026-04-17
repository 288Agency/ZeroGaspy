-- Stockage cloud de la progression gamification
-- Un row par utilisateur (upsert, pas d'historique)

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  challenges  JSONB DEFAULT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour ORDER BY updated_at (logs admin futurs)
CREATE INDEX IF NOT EXISTS idx_user_gamification_updated
  ON user_gamification (updated_at DESC);

-- RLS : chaque utilisateur ne voit que sa propre ligne
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_gamification_self"
  ON user_gamification
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_user_gamification_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_user_gamification_updated_at();
