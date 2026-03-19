-- ============================================================
-- Push Notifications Infrastructure
-- Tables: push_tokens, notification_preferences, notification_log
-- + profiles.last_opened_at column
-- ============================================================

-- 1. push_tokens: stores Expo push tokens per device
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON push_tokens(user_id) WHERE is_active = true;

-- 2. notification_preferences: per-user notification settings synced from app
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  daily_reminder BOOLEAN NOT NULL DEFAULT true,
  daily_reminder_time TEXT NOT NULL DEFAULT '09:00',
  days_before_expiration INTEGER NOT NULL DEFAULT 3,
  re_engagement_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT DEFAULT 'Europe/Paris',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. notification_log: prevents duplicate sends, enables auditing
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_date ON notification_log(user_id, sent_at DESC);

-- 4. Add last_opened_at to profiles for re-engagement tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- push_tokens: users manage their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- notification_preferences: users manage their own prefs
CREATE POLICY "Users can view own notification prefs"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification prefs"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- notification_log: users can view their own logs (read-only for users)
CREATE POLICY "Users can view own notification logs"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
