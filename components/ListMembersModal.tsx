import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  getSharedMembers,
  inviteByEmail,
  updateMemberPermission,
  removeMember,
  leaveList,
  resolveCloudListId,
  ShareMember,
} from '../services/listSharingService';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

interface ListMembersModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  listColor?: string;
  isOwner: boolean;
  onLeft?: () => void;
}

export default function ListMembersModal({
  visible,
  onClose,
  listId,
  listTitle,
  listColor = COLORS.primary[500],
  isOwner,
  onLeft,
}: ListMembersModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState<ShareMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMembers();
      setInviteEmail('');
    }
  }, [visible]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      // Fetch the owner info
      const cloudId = await resolveCloudListId(listId);
      let ownerMember: ShareMember | null = null;
      if (cloudId) {
        const { data: listData } = await supabase
          .from('lists')
          .select('user_id')
          .eq('id', cloudId)
          .single();
        if (listData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', listData.user_id)
            .single();
          if (profile) {
            ownerMember = {
              id: 'owner',
              userId: profile.id,
              email: null,
              fullName: profile.full_name,
              permission: 'edit' as const,
              status: 'accepted' as const,
              createdAt: '',
            };
          }
        }
      }
      const data = await getSharedMembers(listId);
      setMembers(ownerMember ? [ownerMember, ...data] : data);
    } catch {
      const data = await getSharedMembers(listId);
      setMembers(data);
    }
    setIsLoading(false);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;

    setIsInviting(true);
    const { error } = await inviteByEmail(listId, email);
    setIsInviting(false);

    if (error) {
      const msg = error === 'USER_NOT_FOUND' ? t('sharing.userNotFound')
        : error === 'ALREADY_MEMBER' ? t('sharing.errorAlreadyMember')
        : error === 'OWN_LIST' ? t('sharing.errorOwnList')
        : t('sharing.errorGeneric');
      Alert.alert(t('common.error'), msg);
      return;
    }

    Alert.alert(t('common.success'), t('sharing.inviteSuccess'));
    setInviteEmail('');
    await loadMembers();
  };

  const handleTogglePermission = async (member: ShareMember) => {
    const newPermission = member.permission === 'edit' ? 'view' : 'edit';
    const { error } = await updateMemberPermission(member.id, newPermission);
    if (error) {
      Alert.alert(t('common.error'), t('sharing.errorGeneric'));
      return;
    }
    await loadMembers();
  };

  const handleRemoveMember = (member: ShareMember) => {
    const name = member.fullName || member.email || t('sharing.member');
    Alert.alert(
      t('sharing.removeMember'),
      t('sharing.removeMemberConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeMember(member.id);
            if (error) {
              Alert.alert(t('common.error'), t('sharing.errorGeneric'));
              return;
            }
            await loadMembers();
          },
        },
      ]
    );
  };

  const handleLeaveList = () => {
    Alert.alert(
      t('sharing.leaveList'),
      t('sharing.leaveConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sharing.leaveList'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await leaveList(listId);
            if (error) {
              Alert.alert(t('common.error'), t('sharing.errorGeneric'));
              return;
            }
            Alert.alert(t('common.success'), t('sharing.leaveSuccess'));
            onClose();
            onLeft?.();
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: ShareMember }) => {
    const isCurrentUser = item.userId === user?.id;
    const isOwnerRow = item.id === 'owner';
    const displayName = item.fullName || item.email || t('sharing.member');

    return (
      <View style={styles.memberRow}>
        {/* Avatar placeholder */}
        <View style={[styles.avatar, { backgroundColor: hexToRgba(listColor, 0.15) }]}>
          <Text style={[styles.avatarText, { color: listColor }]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {displayName}
            </Text>
            {isCurrentUser && (
              <Text style={styles.youBadge}>{t('sharing.you')}</Text>
            )}
          </View>
          <Text style={[styles.permissionBadge, { color: listColor }]}>
            {isOwnerRow
              ? t('sharing.owner')
              : item.permission === 'edit'
                ? t('sharing.permissionEdit')
                : t('sharing.permissionView')}
          </Text>
        </View>

        {/* Owner actions (not on owner row or current user) */}
        {isOwner && !isCurrentUser && !isOwnerRow && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              onPress={() => handleTogglePermission(item)}
              style={styles.actionIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.permission === 'edit' ? 'eye-outline' : 'pencil-outline'}
                size={20}
                color={COLORS.text.secondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleRemoveMember(item)}
              style={styles.actionIcon}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.semantic.dangerLight} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('sharing.members')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.listName}>{listTitle}</Text>

          {/* Members list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={listColor} />
            </View>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              style={styles.membersList}
              contentContainerStyle={styles.membersContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.text.muted} />
                  <Text style={styles.emptyText}>{t('sharing.noMembers')}</Text>
                </View>
              }
            />
          )}

          {/* Invite section (owner only) */}
          {isOwner && (
            <View style={styles.inviteSection}>
              <View style={styles.inviteRow}>
                <TextInput
                  style={styles.inviteInput}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder={t('sharing.emailPlaceholder')}
                  placeholderTextColor={COLORS.neutral.grayDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    { backgroundColor: listColor },
                    (!inviteEmail.trim().includes('@') || isInviting) && { opacity: 0.5 },
                  ]}
                  onPress={handleInvite}
                  disabled={!inviteEmail.trim().includes('@') || isInviting}
                  activeOpacity={0.8}
                >
                  {isInviting ? (
                    <ActivityIndicator color={COLORS.neutral.white} size="small" />
                  ) : (
                    <Ionicons name="person-add" size={20} color={COLORS.neutral.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Leave button (member only) */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveList}
              activeOpacity={0.7}
            >
              <Ionicons name="exit-outline" size={20} color={COLORS.semantic.dangerLight} />
              <Text style={styles.leaveButtonText}>{t('sharing.leaveList')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray300,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  listName: {
    fontSize: 15,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  loadingContainer: {
    padding: SPACING['2xl'],
    alignItems: 'center',
  },
  membersList: {
    maxHeight: 300,
  },
  membersContent: {
    paddingHorizontal: SPACING.xl,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray100,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.muted,
    backgroundColor: COLORS.neutral.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  permissionBadge: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionIcon: {
    padding: SPACING.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.text.muted,
    marginTop: SPACING.md,
  },
  inviteSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inviteInput: {
    flex: 1,
    backgroundColor: COLORS.neutral.gray100,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  inviteButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.semantic.dangerLight,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.semantic.dangerLight,
  },
});
