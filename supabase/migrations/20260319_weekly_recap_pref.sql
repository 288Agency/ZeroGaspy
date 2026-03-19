ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS weekly_recap_enabled boolean DEFAULT true;
