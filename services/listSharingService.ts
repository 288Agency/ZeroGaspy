import { supabase, CloudFoodItem } from '../config/supabase';
import { List, FoodItem } from '../types';
import logger from '../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────

export interface ShareMember {
  id: string;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface SharedListWithMe {
  shareId: string;
  listId: string;
  listTitle: string;
  listColor: string | null;
  listIcon: string | null;
  ownerName: string | null;
  permission: 'view' | 'edit';
  memberCount: number;
}

// ─── Invite by email (SECURITY DEFINER — bypasses RLS) ──────────────

/**
 * Invite a user to a list by email via Postgres RPC.
 * The DB function handles: resolving local→cloud ID, looking up user, creating share.
 */
export async function inviteByEmail(
  listId: string,
  email: string,
  permission: 'view' | 'edit' = 'edit'
): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('invite_to_list', {
      p_local_list_id: listId,
      p_email: email.trim().toLowerCase(),
      p_permission: permission,
    });

    if (error) {
      logger.error('[Sharing] RPC invite_to_list error:', error);
      return { error: error.message };
    }

    const result = data as { error: string | null };
    if (result.error) {
      logger.warn('[Sharing] invite_to_list returned:', result.error);
      return { error: result.error };
    }

    return { error: null };
  } catch (err: any) {
    logger.error('[Sharing] inviteByEmail exception:', err);
    return { error: err.message || 'UNKNOWN_ERROR' };
  }
}

// ─── Helper: resolve local ID → cloud UUID ──────────────────────────

function isUUID(id: string): boolean {
  return id.includes('-') && id.length === 36;
}

export async function resolveCloudListId(listId: string): Promise<string | null> {
  if (isUUID(listId)) return listId;
  try {
    const { data } = await supabase
      .from('lists')
      .select('id')
      .eq('local_id', listId)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

// ─── Member management (still uses direct queries — owner has RLS) ──

export async function getSharedMembers(listId: string): Promise<ShareMember[]> {
  try {
    const cloudId = await resolveCloudListId(listId);
    if (!cloudId) return [];

    const { data, error } = await supabase
      .from('list_shares')
      .select('id, shared_with_user_id, shared_with_email, permission, status, created_at')
      .eq('list_id', cloudId)
      .eq('status', 'accepted');

    if (error || !data) return [];

    const userIds = data
      .map((s) => s.shared_with_user_id)
      .filter(Boolean) as string[];

    let profileMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profiles?.forEach((p) => { profileMap[p.id] = p.full_name; });
    }

    return data.map((share) => ({
      id: share.id,
      userId: share.shared_with_user_id,
      email: share.shared_with_email,
      fullName: share.shared_with_user_id
        ? profileMap[share.shared_with_user_id] || null
        : null,
      permission: share.permission as 'view' | 'edit',
      status: share.status as 'pending' | 'accepted',
      createdAt: share.created_at,
    }));
  } catch (err) {
    logger.error('[Sharing] getSharedMembers error:', err);
    return [];
  }
}

export async function updateMemberPermission(
  shareId: string,
  permission: 'view' | 'edit'
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .update({ permission, updated_at: new Date().toISOString() })
      .eq('id', shareId);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function removeMember(shareId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('id', shareId);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function leaveList(listId: string): Promise<{ error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const cloudId = await resolveCloudListId(listId);
    if (!cloudId) return { error: 'List not found' };

    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('list_id', cloudId)
      .eq('shared_with_user_id', user.id);
    return { error: error?.message || null };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function getSharedListsWithMe(): Promise<SharedListWithMe[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('list_shares')
      .select('id, list_id, owner_id, permission')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted');

    if (error || !data || data.length === 0) return [];

    const listIds = data.map((s) => s.list_id);
    const { data: lists } = await supabase
      .from('lists')
      .select('id, local_id, title, color, icon')
      .in('id', listIds);

    const ownerIds = [...new Set(data.map((s) => s.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds);

    const listMap: Record<string, any> = {};
    lists?.forEach((l) => { listMap[l.id] = l; });

    const profileMap: Record<string, string | null> = {};
    profiles?.forEach((p) => { profileMap[p.id] = p.full_name; });

    return data.map((share) => {
      const list = listMap[share.list_id];
      return {
        shareId: share.id,
        listId: list?.local_id || share.list_id,
        listTitle: list?.title || 'Liste',
        listColor: list?.color || null,
        listIcon: list?.icon || null,
        ownerName: profileMap[share.owner_id] || null,
        permission: share.permission as 'view' | 'edit',
        memberCount: 1, // simplified — accurate count not critical for listing
      };
    });
  } catch (err) {
    logger.error('[Sharing] getSharedListsWithMe error:', err);
    return [];
  }
}

export async function getShareCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data } = await supabase
      .from('list_shares')
      .select('list_id')
      .eq('owner_id', user.id)
      .eq('status', 'accepted');

    if (!data) return 0;
    return new Set(data.map((s) => s.list_id)).size;
  } catch {
    return 0;
  }
}

export async function canShare(isPremium: boolean): Promise<boolean> {
  if (isPremium) return true;
  const count = await getShareCount();
  return count < 1;
}

export async function getMyPermission(
  listId: string
): Promise<'owner' | 'edit' | 'view' | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cloudId = await resolveCloudListId(listId);
    if (!cloudId) return null;

    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', cloudId)
      .single();

    if (list?.user_id === user.id) return 'owner';

    const { data: share } = await supabase
      .from('list_shares')
      .select('permission')
      .eq('list_id', cloudId)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (share) return share.permission as 'edit' | 'view';
    return null;
  } catch {
    return null;
  }
}

export async function getMemberCount(listId: string): Promise<number> {
  try {
    const cloudId = await resolveCloudListId(listId);
    if (!cloudId) return 0;

    const { count } = await supabase
      .from('list_shares')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', cloudId)
      .eq('status', 'accepted');

    return (count || 0) + 1;
  } catch {
    return 0;
  }
}

// ─── Load shared list from cloud (for members) ──────────────────────

function convertCloudItemToLocal(item: CloudFoodItem): FoodItem {
  const convertISOToDate = (isoStr: string): string => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  };

  return {
    id: item.local_id || item.id,
    name: item.name,
    expirationDate: convertISOToDate(item.expiration_date),
    quantity: item.quantity,
    weight: item.weight || undefined,
    category: item.category || undefined,
    imageUri: item.image_uri || undefined,
    price: item.price || undefined,
    status: item.status,
    isOpened: item.is_opened,
    openedDate: item.opened_date ? convertISOToDate(item.opened_date) : undefined,
    daysAfterOpening: item.days_after_opening || undefined,
  };
}

/**
 * Load a shared list directly from Supabase (for members who don't have it locally).
 * Returns a List object compatible with the local format, or null if not found/not authorized.
 */
export async function loadSharedListFromCloud(listId: string): Promise<List | null> {
  try {
    const cloudId = await resolveCloudListId(listId);
    if (!cloudId) return null;

    // Fetch list metadata
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id, local_id, title, color, icon, created_at')
      .eq('id', cloudId)
      .single();

    if (listError || !listData) {
      logger.error('[Sharing] loadSharedListFromCloud list error:', listError);
      return null;
    }

    // Fetch food items for this list
    const { data: items, error: itemsError } = await supabase
      .from('food_items')
      .select('*')
      .eq('list_id', cloudId)
      .eq('is_deleted', false);

    if (itemsError) {
      logger.error('[Sharing] loadSharedListFromCloud items error:', itemsError);
    }

    return {
      id: listData.local_id || listData.id,
      title: listData.title,
      color: listData.color || '#3C6E47',
      icon: listData.icon || 'snow-outline',
      createdAt: listData.created_at,
      items: (items || []).map((item: CloudFoodItem) => convertCloudItemToLocal(item)),
    };
  } catch (err) {
    logger.error('[Sharing] loadSharedListFromCloud exception:', err);
    return null;
  }
}
