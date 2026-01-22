import { supabase } from '../../config/supabase';
import logger from '../../utils/logger';

// Types pour le partage
export interface ListShare {
  id: string;
  list_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  invitation_code: string;
  created_at: string;
  accepted_at: string | null;
}

export interface ListMember {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  permission: 'owner' | 'edit' | 'view';
  joined_at: string;
}

// ============================================
// INVITATIONS
// ============================================

/**
 * Génère un code d'invitation unique
 */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Génère un code d'invitation pour une liste (sans email)
 */
export async function generateInvitationCodeForList(
  listId: string,
  listTitle: string,
  ownerUserId: string,
  permission: 'view' | 'edit' | 'admin' = 'edit'
): Promise<{ success: boolean; invitationCode?: string; cloudListId?: string; error?: string }> {
  try {
    // Vérifier si la liste existe dans Supabase par local_id OU par id
    let { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, user_id, local_id')
      .or(`id.eq.${listId},local_id.eq.${listId}`)
      .single();

    let cloudListId: string;

    // Si la liste n'existe pas, la créer avec un nouveau UUID
    if (listError || !list) {
      logger.debug('Liste non trouvée dans Supabase, création...');
      const { data: newList, error: createError } = await supabase
        .from('lists')
        .insert({
          user_id: ownerUserId,
          title: listTitle,
          color: '#3C6E47',
          local_id: listId, // Stocker l'ID local
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newList) {
        logger.error('Erreur création liste:', createError);
        return { success: false, error: 'Impossible de créer la liste' };
      }

      cloudListId = newList.id;
    } else {
      // Vérifier que l'utilisateur est le propriétaire
      if (list.user_id !== ownerUserId) {
        return { success: false, error: 'Vous n\'êtes pas le propriétaire de cette liste' };
      }
      cloudListId = list.id;
    }

    // Créer l'invitation avec un code unique
    const invitationCode = generateInvitationCode();
    const { data: share, error: shareError } = await supabase
      .from('list_shares')
      .insert({
        list_id: cloudListId, // Utiliser l'ID cloud (UUID)
        owner_id: ownerUserId,
        shared_with_email: '', // Email vide car on génère juste un code
        shared_with_user_id: null,
        permission,
        status: 'pending',
        invitation_code: invitationCode,
      })
      .select()
      .single();

    if (shareError) {
      logger.error('Erreur création invitation:', shareError);
      return { success: false, error: 'Impossible de créer l\'invitation' };
    }

    logger.debug(`Code d'invitation généré: ${invitationCode}`);

    return {
      success: true,
      invitationCode,
      cloudListId,
    };
  } catch (error) {
    logger.error('Erreur génération code invitation:', error);
    return { success: false, error: 'Erreur lors de la génération du code' };
  }
}

/**
 * Invite un utilisateur à rejoindre une liste par email
 */
export async function inviteUserByEmail(
  listId: string,
  ownerUserId: string,
  email: string,
  permission: 'view' | 'edit' | 'admin' = 'edit'
): Promise<{ success: boolean; invitationCode?: string; error?: string }> {
  try {
    // Vérifier que l'utilisateur est bien le propriétaire
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return { success: false, error: 'Liste introuvable' };
    }

    if (list.user_id !== ownerUserId) {
      return { success: false, error: 'Vous n\'êtes pas le propriétaire de cette liste' };
    }

    // Vérifier si l'email est déjà invité
    const { data: existingShare } = await supabase
      .from('list_shares')
      .select('*')
      .eq('list_id', listId)
      .eq('shared_with_email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existingShare) {
      return {
        success: false,
        error: 'Cet utilisateur a déjà été invité',
      };
    }

    // Chercher si l'utilisateur existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Créer l'invitation
    const invitationCode = generateInvitationCode();
    const { data: share, error: shareError } = await supabase
      .from('list_shares')
      .insert({
        list_id: listId,
        owner_id: ownerUserId,
        shared_with_email: email.toLowerCase(),
        shared_with_user_id: profile?.id || null,
        permission,
        status: 'pending',
        invitation_code: invitationCode,
      })
      .select()
      .single();

    if (shareError) {
      logger.error('Erreur création invitation:', shareError);
      return { success: false, error: 'Impossible de créer l\'invitation' };
    }

    // TODO: Envoyer un email de notification
    logger.debug(`Invitation créée pour ${email} avec le code ${invitationCode}`);

    return {
      success: true,
      invitationCode,
    };
  } catch (error) {
    logger.error('Erreur invitation utilisateur:', error);
    return { success: false, error: 'Erreur lors de l\'invitation' };
  }
}

/**
 * Accepte une invitation par code
 */
export async function acceptInvitationByCode(
  userId: string,
  invitationCode: string
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    // Récupérer l'invitation
    const { data: share, error: shareError } = await supabase
      .from('list_shares')
      .select('*')
      .eq('invitation_code', invitationCode.toUpperCase())
      .eq('status', 'pending')
      .single();

    if (shareError || !share) {
      return { success: false, error: 'Code d\'invitation invalide' };
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const { data: existingShare } = await supabase
      .from('list_shares')
      .select('*')
      .eq('list_id', share.list_id)
      .eq('shared_with_user_id', userId)
      .eq('status', 'accepted')
      .single();

    if (existingShare) {
      return { success: false, error: 'Vous êtes déjà membre de cette liste' };
    }

    // Si l'invitation a un email spécifié, vérifier qu'il correspond
    if (share.shared_with_email && share.shared_with_email.trim() !== '') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!profile || profile.email?.toLowerCase() !== share.shared_with_email.toLowerCase()) {
        return {
          success: false,
          error: 'Cette invitation n\'est pas pour vous',
        };
      }
    }

    // Accepter l'invitation
    const { error: updateError } = await supabase
      .from('list_shares')
      .update({
        shared_with_user_id: userId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', share.id);

    if (updateError) {
      logger.error('Erreur acceptation invitation:', updateError);
      return { success: false, error: 'Impossible d\'accepter l\'invitation' };
    }

    return { success: true, listId: share.list_id };
  } catch (error) {
    logger.error('Erreur acceptation invitation:', error);
    return { success: false, error: 'Erreur lors de l\'acceptation' };
  }
}

/**
 * Refuse une invitation
 */
export async function declineInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      logger.error('Erreur refus invitation:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Erreur refus invitation:', error);
    return false;
  }
}

// ============================================
// GESTION DES MEMBRES
// ============================================

/**
 * Récupère tous les membres d'une liste
 */
export async function getListMembers(listId: string): Promise<ListMember[]> {
  try {
    // Récupérer le propriétaire
    const { data: list } = await supabase
      .from('lists')
      .select('user_id, created_at, profiles!inner(email, full_name, avatar_url)')
      .eq('id', listId)
      .single();

    const members: ListMember[] = [];

    if (list) {
      members.push({
        user_id: list.user_id,
        email: (list.profiles as any).email,
        full_name: (list.profiles as any).full_name,
        avatar_url: (list.profiles as any).avatar_url,
        permission: 'owner',
        joined_at: list.created_at,
      });
    }

    // Récupérer les membres partagés
    const { data: shares } = await supabase
      .from('list_shares')
      .select('shared_with_user_id, permission, accepted_at, profiles!inner(email, full_name, avatar_url)')
      .eq('list_id', listId)
      .eq('status', 'accepted');

    if (shares) {
      shares.forEach((share: any) => {
        members.push({
          user_id: share.shared_with_user_id,
          email: share.profiles.email,
          full_name: share.profiles.full_name,
          avatar_url: share.profiles.avatar_url,
          permission: share.permission,
          joined_at: share.accepted_at,
        });
      });
    }

    return members;
  } catch (error) {
    logger.error('Erreur récupération membres:', error);
    return [];
  }
}

/**
 * Récupère les invitations en attente pour une liste
 */
export async function getPendingInvitations(listId: string): Promise<ListShare[]> {
  try {
    const { data, error } = await supabase
      .from('list_shares')
      .select('*')
      .eq('list_id', listId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Erreur récupération invitations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Erreur récupération invitations:', error);
    return [];
  }
}

/**
 * Récupère les invitations pour un utilisateur
 */
export async function getUserInvitations(userEmail: string): Promise<ListShare[]> {
  try {
    const { data, error } = await supabase
      .from('list_shares')
      .select(`
        *,
        lists!inner(title, color),
        profiles!list_shares_owner_id_fkey(full_name, email)
      `)
      .eq('shared_with_email', userEmail.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Erreur récupération invitations utilisateur:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Erreur récupération invitations utilisateur:', error);
    return [];
  }
}

/**
 * Supprime un membre d'une liste
 */
export async function removeMemberFromList(
  listId: string,
  ownerUserId: string,
  memberUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que l'utilisateur est bien le propriétaire
    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (!list || list.user_id !== ownerUserId) {
      return { success: false, error: 'Vous n\'êtes pas le propriétaire' };
    }

    // Supprimer le partage
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('list_id', listId)
      .eq('shared_with_user_id', memberUserId);

    if (error) {
      logger.error('Erreur suppression membre:', error);
      return { success: false, error: 'Impossible de supprimer le membre' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Erreur suppression membre:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Change la permission d'un membre
 */
export async function changePermission(
  listId: string,
  ownerUserId: string,
  memberUserId: string,
  newPermission: 'view' | 'edit' | 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que l'utilisateur est bien le propriétaire
    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (!list || list.user_id !== ownerUserId) {
      return { success: false, error: 'Vous n\'êtes pas le propriétaire' };
    }

    // Mettre à jour la permission
    const { error } = await supabase
      .from('list_shares')
      .update({ permission: newPermission })
      .eq('list_id', listId)
      .eq('shared_with_user_id', memberUserId);

    if (error) {
      logger.error('Erreur modification permission:', error);
      return { success: false, error: 'Impossible de modifier la permission' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Erreur modification permission:', error);
    return { success: false, error: 'Erreur lors de la modification' };
  }
}

// ============================================
// VÉRIFICATIONS DE PERMISSIONS
// ============================================

/**
 * Vérifie si un utilisateur a accès à une liste
 */
export async function checkListAccess(
  userId: string,
  listId: string
): Promise<{ hasAccess: boolean; permission: 'owner' | 'admin' | 'edit' | 'view' | null }> {
  try {
    // Vérifier si c'est le propriétaire
    const { data: list } = await supabase
      .from('lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (list && list.user_id === userId) {
      return { hasAccess: true, permission: 'owner' };
    }

    // Vérifier si partagé avec l'utilisateur
    const { data: share } = await supabase
      .from('list_shares')
      .select('permission')
      .eq('list_id', listId)
      .eq('shared_with_user_id', userId)
      .eq('status', 'accepted')
      .single();

    if (share) {
      return { hasAccess: true, permission: share.permission };
    }

    return { hasAccess: false, permission: null };
  } catch (error) {
    logger.error('Erreur vérification accès:', error);
    return { hasAccess: false, permission: null };
  }
}

/**
 * Vérifie si un utilisateur peut modifier une liste
 */
export async function canEditList(userId: string, listId: string): Promise<boolean> {
  const { hasAccess, permission } = await checkListAccess(userId, listId);
  return hasAccess && (permission === 'owner' || permission === 'edit' || permission === 'admin');
}

/**
 * Quitte une liste partagée
 */
export async function leaveSharedList(
  userId: string,
  listId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('list_id', listId)
      .eq('shared_with_user_id', userId);

    if (error) {
      logger.error('Erreur quitter liste:', error);
      return { success: false, error: 'Impossible de quitter la liste' };
    }

    return { success: true };
  } catch (error) {
    logger.error('Erreur quitter liste:', error);
    return { success: false, error: 'Erreur lors du départ' };
  }
}
