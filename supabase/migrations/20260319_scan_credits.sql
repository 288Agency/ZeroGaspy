CREATE TABLE IF NOT EXISTS scan_credits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

ALTER TABLE scan_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scan credits"
  ON scan_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan credits"
  ON scan_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
