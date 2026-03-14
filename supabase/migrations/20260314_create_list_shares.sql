-- ============================================
-- LIST SHARING: list_shares table
-- ============================================

CREATE TABLE IF NOT EXISTS list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  shared_with_email TEXT,
  shared_with_user_id UUID REFERENCES auth.users(id),
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'edit',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  invitation_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast invitation code lookups
CREATE INDEX IF NOT EXISTS idx_list_shares_invitation_code ON list_shares(invitation_code);

-- Index for finding shares by user
CREATE INDEX IF NOT EXISTS idx_list_shares_shared_with_user ON list_shares(shared_with_user_id);

-- Index for finding shares by list
CREATE INDEX IF NOT EXISTS idx_list_shares_list_id ON list_shares(list_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE list_shares ENABLE ROW LEVEL SECURITY;

-- Owner can do everything on their shares
CREATE POLICY "Owners can manage their list shares"
  ON list_shares
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Shared users can see shares they're part of
CREATE POLICY "Shared users can view their shares"
  ON list_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Shared users can update their share status (accept/decline)
CREATE POLICY "Shared users can update their share status"
  ON list_shares
  FOR UPDATE
  USING (shared_with_user_id = auth.uid())
  WITH CHECK (shared_with_user_id = auth.uid());

-- Anyone can read a share by invitation code (for joining)
CREATE POLICY "Anyone can lookup by invitation code"
  ON list_shares
  FOR SELECT
  USING (invitation_code IS NOT NULL AND status = 'pending');

-- Anyone authenticated can accept a pending invitation by code
CREATE POLICY "Anyone can accept invitation by code"
  ON list_shares
  FOR UPDATE
  USING (invitation_code IS NOT NULL AND status = 'pending')
  WITH CHECK (shared_with_user_id = auth.uid());

-- ============================================
-- SHARED LISTS ACCESS: Allow shared users to read/write list data
-- ============================================

-- Allow shared users (with 'accepted' status) to read the shared list
CREATE POLICY "Shared users can read shared lists"
  ON lists
  FOR SELECT
  USING (
    id IN (
      SELECT list_id FROM list_shares
      WHERE shared_with_user_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- Allow shared users with 'edit' permission to read food items in shared lists
CREATE POLICY "Shared users can read shared list items"
  ON food_items
  FOR SELECT
  USING (
    list_id IN (
      SELECT list_id FROM list_shares
      WHERE shared_with_user_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- Allow shared users with 'edit' permission to insert food items
CREATE POLICY "Shared editors can insert items in shared lists"
  ON food_items
  FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM list_shares
      WHERE shared_with_user_id = auth.uid()
      AND status = 'accepted'
      AND permission = 'edit'
    )
  );

-- Allow shared users with 'edit' permission to update food items
CREATE POLICY "Shared editors can update items in shared lists"
  ON food_items
  FOR UPDATE
  USING (
    list_id IN (
      SELECT list_id FROM list_shares
      WHERE shared_with_user_id = auth.uid()
      AND status = 'accepted'
      AND permission = 'edit'
    )
  );

-- ============================================
-- FUNCTION: auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_list_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_list_shares_updated_at
  BEFORE UPDATE ON list_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_list_shares_updated_at();
