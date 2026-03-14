import { supabase } from '../config/supabase';
import logger from '../utils/logger';

// ==================== TYPES ====================

export interface ListShare {
  id: string;
  list_id: string;
  owner_id: string;
  shared_with_email: string | null;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'declined';
  invitation_code: string | null;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
}

export interface SharedMember {
  shareId: string;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'declined';
  joinedAt: string | null;
}

export interface SharedListInfo {
  listId: string;
  listTitle: string;
  ownerName: string | null;
  permission: 'view' | 'edit';
  memberCount: number;
}

// ==================== INVITATION CODE ====================

/**
 * Generate a 6-character alphanumeric invitation code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (I,O,0,1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique invitation code and create a list share entry
 */
export async function generateInvitationCode(
  listId: string,
  permission: 'view' | 'edit' = 'edit'
): Promise<{ code: string; shareId: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('User not authenticated');
      return null;
    }

    // Generate unique code with retry
    let code = generateCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data, error } = await supabase
        .from('list_shares')
        .insert({
          list_id: listId,
          owner_id: user.id,
          permission,
          status: 'pending',
          invitation_code: code,
        })
        .select('id')
        .single();

      if (!error && data) {
        return { code, shareId: data.id };
      }

      // Code collision, generate a new one
      if (error?.code === '23505') {
        code = generateCode();
        attempts++;
        continue;
      }

      logger.error('Error generating invitation code:', error);
      return null;
    }

    logger.error('Failed to generate unique code after 5 attempts');
    return null;
  } catch (error) {
    logger.error('Error in generateInvitationCode:', error);
    return null;
  }
}

// ==================== JOIN / ACCEPT ====================

/**
 * Look up an invitation by code
 */
export async function lookupInvitation(code: string): Promise<{
  share: ListShare;
  listTitle: string;
  ownerName: string | null;
} | null> {
  try {
    const normalizedCode = code.toUpperCase().trim();

    const { data, error } = await supabase
      .from('list_shares')
      .select(`
        *,
        lists!inner(title)
      `)
      .eq('invitation_code', normalizedCode)
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      return null;
    }

    // Fetch owner name separately (profiles table FK goes through auth.users)
    let ownerName: string | null = null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', (data as any).owner_id)
      .single();
    if (profile) ownerName = profile.full_name;

    return {
      share: data as ListShare,
      listTitle: (data as any).lists?.title ?? 'Unknown',
      ownerName,
    };
  } catch (error) {
    logger.error('Error looking up invitation:', error);
    return null;
  }
}

/**
 * Accept an invitation and join the shared list
 */
export async function acceptInvitation(code: string): Promise<{
  success: boolean;
  listId?: string;
  listTitle?: string;
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const normalizedCode = code.toUpperCase().trim();

    // Find the share
    const { data: share, error: findError } = await supabase
      .from('list_shares')
      .select('*, lists!inner(title)')
      .eq('invitation_code', normalizedCode)
      .eq('status', 'pending')
      .single();

    if (findError || !share) {
      return { success: false, error: 'invalid_code' };
    }

    // Can't join your own list
    if (share.owner_id === user.id) {
      return { success: false, error: 'own_list' };
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('list_shares')
      .select('id')
      .eq('list_id', share.list_id)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (existing) {
      return { success: false, error: 'already_member' };
    }

    // Accept the invitation
    const { error: updateError } = await supabase
      .from('list_shares')
      .update({
        shared_with_user_id: user.id,
        shared_with_email: user.email,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invitation_code: null, // Invalidate the code after use
      })
      .eq('id', share.id);

    if (updateError) {
      logger.error('Error accepting invitation:', updateError);
      return { success: false, error: 'accept_failed' };
    }

    return {
      success: true,
      listId: share.list_id,
      listTitle: (share as any).lists?.title,
    };
  } catch (error) {
    logger.error('Error in acceptInvitation:', error);
    return { success: false, error: 'unknown' };
  }
}

// ==================== MEMBERS MANAGEMENT ====================

/**
 * Get all members of a shared list
 */
export async function getSharedMembers(listId: string): Promise<SharedMember[]> {
  try {
    const { data, error } = await supabase
      .from('list_shares')
      .select(`
        id,
        shared_with_user_id,
        shared_with_email,
        permission,
        status,
        accepted_at
      `)
      .eq('list_id', listId)
      .in('status', ['accepted', 'pending']);

    if (error) {
      logger.error('Error fetching shared members:', error);
      return [];
    }

    // Fetch display names separately
    const userIds = (data || [])
      .map((item: any) => item.shared_with_user_id)
      .filter(Boolean);

    const namesMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      for (const p of profiles || []) {
        if (p.full_name) namesMap.set(p.id, p.full_name);
      }
    }

    return (data || []).map((item: any) => ({
      shareId: item.id,
      userId: item.shared_with_user_id,
      email: item.shared_with_email,
      displayName: namesMap.get(item.shared_with_user_id) ?? null,
      permission: item.permission,
      status: item.status,
      joinedAt: item.accepted_at,
    }));
  } catch (error) {
    logger.error('Error in getSharedMembers:', error);
    return [];
  }
}

/**
 * Update a member's permission
 */
export async function updatePermission(
  shareId: string,
  permission: 'view' | 'edit'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      logger.error('Error updating permission:', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Error in updatePermission:', error);
    return false;
  }
}

/**
 * Remove a member from a shared list (owner only)
 */
export async function removeMember(shareId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      logger.error('Error removing member:', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Error in removeMember:', error);
    return false;
  }
}

/**
 * Leave a shared list (shared user)
 */
export async function leaveList(listId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('list_id', listId)
      .eq('shared_with_user_id', user.id);

    if (error) {
      logger.error('Error leaving list:', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Error in leaveList:', error);
    return false;
  }
}

// ==================== SHARED LISTS QUERIES ====================

/**
 * Get all lists shared with the current user
 */
export async function getSharedLists(): Promise<SharedListInfo[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('list_shares')
      .select(`
        list_id,
        owner_id,
        permission,
        lists!inner(title)
      `)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted');

    if (error) {
      logger.error('Error fetching shared lists:', error);
      return [];
    }

    // Fetch owner names separately
    const ownerIds = [...new Set((data || []).map((item: any) => item.owner_id))];
    const ownerNamesMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds);
      for (const p of profiles || []) {
        if (p.full_name) ownerNamesMap.set(p.id, p.full_name);
      }
    }

    return (data || []).map((item: any) => ({
      listId: item.list_id,
      listTitle: item.lists?.title ?? 'Unknown',
      ownerName: ownerNamesMap.get(item.owner_id) ?? null,
      permission: item.permission,
      memberCount: 0,
    }));
  } catch (error) {
    logger.error('Error in getSharedLists:', error);
    return [];
  }
}

/**
 * Check if a list is shared (has any accepted members)
 */
export async function isListShared(listId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('list_shares')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId)
      .eq('status', 'accepted');

    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get the user's permission for a shared list
 */
export async function getUserPermission(listId: string): Promise<'owner' | 'edit' | 'view' | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if owner
    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (list?.user_id === user.id) return 'owner';

    // Check if shared with user
    const { data: share } = await supabase
      .from('list_shares')
      .select('permission')
      .eq('list_id', listId)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted')
      .single();

    return share?.permission ?? null;
  } catch {
    return null;
  }
}

// ==================== REALTIME ====================

/**
 * Subscribe to realtime changes on a shared list's items
 */
export function subscribeToSharedList(
  listId: string,
  onUpdate: () => void
) {
  const channel = supabase
    .channel(`shared-list-${listId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_items',
        filter: `list_id=eq.${listId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
