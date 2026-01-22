import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import PressableScale from '../components/PressableScale';
import ShareListModal from '../components/ShareListModal';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import {
  getListMembers,
  getPendingInvitations,
  removeMemberFromList,
  changePermission,
  ListMember,
  ListShare,
} from '../services/supabase/listSharingService';
import { supabase } from '../config/supabase';

type RoutePropType = RouteProp<RootStackParamList, 'ListMembers'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ListMembers'>;

export default function ListMembersScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { listId, listTitle, listColor = COLORS.primary[500] } = route.params;

  const [members, setMembers] = useState<ListMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ListShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ListMember | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [listId]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Membres',
      headerStyle: { backgroundColor: COLORS.secondary.cream },
      headerTintColor: listColor,
    });
  }, [listColor]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Charger les membres
      const membersData = await getListMembers(listId);
      setMembers(membersData);

      console.log('Membres chargés:', membersData.length);
      console.log('User ID:', user?.id);

      // Vérifier si l'utilisateur est propriétaire
      const owner = membersData.find(m => m.permission === 'owner');
      const isUserOwner = owner?.user_id === user?.id;
      setIsOwner(isUserOwner);

      console.log('Is owner:', isUserOwner);
      console.log('Owner found:', owner?.email);

      // Si pas de membres et l'utilisateur est connecté, il est probablement propriétaire
      if (membersData.length === 0 && user) {
        console.log('Aucun membre trouvé, liste probablement non synchronisée');
        setIsOwner(true); // Considérer l'utilisateur comme propriétaire si la liste n'existe pas encore dans Supabase
      }

      // Charger les invitations en attente (seulement si propriétaire)
      if (isUserOwner) {
        const invitations = await getPendingInvitations(listId);
        setPendingInvitations(invitations);
      }
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      Alert.alert('Erreur', 'Impossible de charger les membres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = (member: ListMember) => {
    Alert.alert(
      'Retirer le membre',
      `Êtes-vous sûr de vouloir retirer ${member.full_name || member.email} de cette liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            const result = await removeMemberFromList(listId, currentUserId, member.user_id);
            if (result.success) {
              Alert.alert('Succès', 'Membre retiré de la liste');
              loadData();
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de retirer le membre');
            }
          },
        },
      ]
    );
  };

  const handleChangePermission = (member: ListMember) => {
    setSelectedMember(member);
    setPermissionModalVisible(true);
  };

  const handlePermissionSelect = async (newPermission: 'view' | 'edit' | 'admin') => {
    if (!selectedMember) return;

    setPermissionModalVisible(false);
    const result = await changePermission(
      listId,
      currentUserId,
      selectedMember.user_id,
      newPermission
    );

    if (result.success) {
      Alert.alert('Succès', 'Permission modifiée');
      loadData();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de modifier la permission');
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'owner':
        return 'crown';
      case 'admin':
        return 'shield-checkmark';
      case 'edit':
        return 'create';
      case 'view':
        return 'eye';
      default:
        return 'person';
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'owner':
        return '#F59E0B';
      case 'admin':
        return '#8B5CF6';
      case 'edit':
        return COLORS.primary[500];
      case 'view':
        return '#6B7280';
      default:
        return COLORS.text.secondary;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'owner':
        return 'Propriétaire';
      case 'admin':
        return 'Admin';
      case 'edit':
        return 'Modification';
      case 'view':
        return 'Lecture seule';
      default:
        return permission;
    }
  };

  const renderMember = ({ item }: { item: ListMember }) => {
    const permissionColor = getPermissionColor(item.permission);
    const canManage = isOwner && item.permission !== 'owner';

    return (
      <View style={styles.memberCard}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: hexToRgba(permissionColor, 0.15) }]}>
          <Text style={[styles.avatarText, { color: permissionColor }]}>
            {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.full_name || 'Utilisateur'}
            {item.user_id === currentUserId && <Text style={styles.youBadge}> (Vous)</Text>}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
        </View>

        {/* Permission badge */}
        <View style={[styles.permissionBadge, { backgroundColor: hexToRgba(permissionColor, 0.1) }]}>
          <Ionicons name={getPermissionIcon(item.permission) as any} size={14} color={permissionColor} />
          <Text style={[styles.permissionText, { color: permissionColor }]}>
            {getPermissionLabel(item.permission)}
          </Text>
        </View>

        {/* Actions */}
        {canManage && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Actions',
                `${item.full_name || item.email}`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Changer permission',
                    onPress: () => handleChangePermission(item),
                  },
                  {
                    text: 'Retirer',
                    style: 'destructive',
                    onPress: () => handleRemoveMember(item),
                  },
                ]
              );
            }}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInvitation = ({ item }: { item: ListShare }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationLeft}>
        <Ionicons name="mail-outline" size={24} color={COLORS.text.muted} />
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationEmail}>{item.shared_with_email}</Text>
          <Text style={styles.invitationCode}>Code: {item.invitation_code}</Text>
        </View>
      </View>
      <View style={styles.invitationBadge}>
        <Text style={styles.invitationBadgeText}>En attente</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header count */}
            <View style={styles.header}>
              <Text style={styles.sectionTitle}>
                Membres ({members.length})
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={COLORS.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>Vous êtes le seul membre</Text>
            <Text style={styles.emptySubtitle}>
              {isOwner
                ? "Invitez d'autres personnes pour partager cette liste et gérer vos aliments ensemble !"
                : "Vous n'avez pas accès à la liste des membres."}
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            {/* Pending invitations */}
            {isOwner && pendingInvitations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Invitations en attente ({pendingInvitations.length})
                </Text>
                {pendingInvitations.map((invitation) => (
                  <View key={invitation.id}>
                    {renderInvitation({ item: invitation })}
                  </View>
                ))}
              </View>
            )}

            {/* Add member button - Toujours afficher si owner */}
            {isOwner && (
              <PressableScale
                onPress={() => setShareModalVisible(true)}
                style={styles.addButton}
                hapticType="medium"
                activeScale={0.97}
              >
                <Ionicons name="person-add" size={20} color={COLORS.neutral.white} />
                <Text style={styles.addButtonText}>Inviter un membre</Text>
              </PressableScale>
            )}

            {/* Message si pas owner */}
            {!isOwner && members.length > 0 && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.text.secondary} />
                <Text style={styles.infoText}>
                  Vous devez être propriétaire pour inviter des membres.
                </Text>
              </View>
            )}
          </>
        }
      />

      {/* Share modal */}
      <ShareListModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          loadData();
        }}
        listId={listId}
        listTitle={listTitle}
        userId={currentUserId}
      />

      {/* Permission change modal */}
      <Modal
        visible={permissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPermissionModalVisible(false)}
        >
          <View style={styles.permissionModal}>
            <Text style={styles.permissionModalTitle}>Changer la permission</Text>
            <Text style={styles.permissionModalSubtitle}>
              {selectedMember?.full_name || selectedMember?.email}
            </Text>

            <TouchableOpacity
              style={styles.permissionOption}
              onPress={() => handlePermissionSelect('view')}
            >
              <Ionicons name="eye-outline" size={22} color={COLORS.text.secondary} />
              <View style={styles.permissionOptionText}>
                <Text style={styles.permissionOptionTitle}>Lecture seule</Text>
                <Text style={styles.permissionOptionDesc}>Peut uniquement voir les aliments</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionOption}
              onPress={() => handlePermissionSelect('edit')}
            >
              <Ionicons name="create-outline" size={22} color={COLORS.primary[500]} />
              <View style={styles.permissionOptionText}>
                <Text style={styles.permissionOptionTitle}>Modification</Text>
                <Text style={styles.permissionOptionDesc}>Peut ajouter et modifier les aliments</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionOption}
              onPress={() => handlePermissionSelect('admin')}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={'#8B5CF6'} />
              <View style={styles.permissionOptionText}>
                <Text style={styles.permissionOptionTitle}>Admin</Text>
                <Text style={styles.permissionOptionDesc}>Peut gérer les membres et permissions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPermissionModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary[500],
    marginBottom: 12,
  },
  section: {
    marginTop: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  youBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    fontWeight: '400',
  },
  memberEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: 8,
  },
  permissionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  menuButton: {
    padding: 4,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.neutral.gray300, 0.3),
    borderStyle: 'dashed',
  },
  invitationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invitationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  invitationEmail: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  invitationCode: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  invitationBadge: {
    backgroundColor: hexToRgba('#F59E0B', 0.15),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  invitationBadgeText: {
    ...TYPOGRAPHY.caption,
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 11,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    marginTop: 24,
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  addButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionModal: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.lg,
  },
  permissionModalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionModalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
  },
  permissionOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  permissionOptionTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  permissionOptionDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: hexToRgba(COLORS.text.muted, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    padding: 14,
    borderRadius: RADIUS.lg,
    marginTop: 20,
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 14,
  },
});
