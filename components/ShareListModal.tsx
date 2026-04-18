import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  inviteByEmail,
  getSharedMembers,
  removeMember,
  updateMemberPermission,
  ShareMember,
} from '../services/listSharingService';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { trackListShared } from '../services/analytics';

interface ShareListModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  listColor?: string;
}

export default function ShareListModal({
  visible,
  onClose,
  listId,
  listTitle,
  listColor = COLORS.primary[500],
}: ShareListModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('edit');
  const [isInviting, setIsInviting] = useState(false);
  const [members, setMembers] = useState<ShareMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMembers();
    } else {
      setEmail('');
      setPermission('edit');
    }
  }, [visible]);

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const data = await getSharedMembers(listId);
      setMembers(data);
    } catch {}
    setIsLoadingMembers(false);
  };

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert(t('common.error'), t('sharing.invalidEmail'));
      return;
    }

    setIsInviting(true);
    try {
      const { error } = await inviteByEmail(listId, trimmedEmail, permission);
      if (error) {
        Alert.alert(t('common.error'), getErrorMessage(error));
      } else {
        Alert.alert(t('common.success'), t('sharing.inviteSuccess'));
        setEmail('');
        await loadMembers();
        // Analytics PostHog
        trackListShared();
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('sharing.errorGeneric'));
    }
    setIsInviting(false);
  };

  const getErrorMessage = (err: string): string => {
    switch (err) {
      case 'USER_NOT_FOUND': return t('sharing.userNotFound');
      case 'ALREADY_MEMBER': return t('sharing.errorAlreadyMember');
      case 'OWN_LIST': return t('sharing.errorOwnList');
      case 'LIST_NOT_FOUND': return t('sharing.errorGeneric');
      case 'NOT_OWNER': return t('sharing.errorGeneric');
      case 'QUOTA_EXCEEDED': return t('sharing.errorQuotaExceeded');
      default: return err;
    }
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
            if (!error) await loadMembers();
          },
        },
      ]
    );
  };

  const handleTogglePermission = async (member: ShareMember) => {
    const newPerm = member.permission === 'edit' ? 'view' : 'edit';
    const { error } = await updateMemberPermission(member.id, newPerm);
    if (!error) await loadMembers();
  };

  const renderMember = ({ item }: { item: ShareMember }) => {
    const isCurrentUser = item.userId === user?.id;
    const displayName = item.fullName || item.email || t('sharing.member');

    return (
      <View style={styles.memberRow}>
        <View style={[styles.avatar, { backgroundColor: hexToRgba(listColor, 0.15) }]}>
          <Text style={[styles.avatarText, { color: listColor }]}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.permissionLabel, { color: listColor }]}>
            {item.permission === 'edit' ? t('sharing.permissionEdit') : t('sharing.permissionView')}
          </Text>
        </View>
        {!isCurrentUser && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              onPress={() => handleTogglePermission(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIcon}
            >
              <Ionicons
                name={item.permission === 'edit' ? 'eye-outline' : 'pencil-outline'}
                size={20}
                color={COLORS.text.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemoveMember(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIcon}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.semantic.dangerLight} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={styles.container} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('sharing.shareList')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.listName}>{listTitle}</Text>

            {/* Email invite section */}
            <View style={styles.inviteSection}>
              <Text style={styles.sectionTitle}>{t('sharing.inviteByEmail')}</Text>
              <TextInput
                style={styles.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder={t('sharing.emailPlaceholder')}
                placeholderTextColor={COLORS.neutral.grayDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Permission toggle */}
              <View style={styles.permissionRow}>
                <TouchableOpacity
                  style={[
                    styles.permissionChip,
                    permission === 'edit' && { borderColor: listColor, backgroundColor: hexToRgba(listColor, 0.08) },
                  ]}
                  onPress={() => setPermission('edit')}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    color={permission === 'edit' ? listColor : COLORS.text.secondary}
                  />
                  <Text style={[
                    styles.permissionChipText,
                    permission === 'edit' && { color: listColor, fontWeight: '600' },
                  ]}>
                    {t('sharing.viewAndEdit')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.permissionChip,
                    permission === 'view' && { borderColor: listColor, backgroundColor: hexToRgba(listColor, 0.08) },
                  ]}
                  onPress={() => setPermission('view')}
                >
                  <Ionicons
                    name="eye-outline"
                    size={16}
                    color={permission === 'view' ? listColor : COLORS.text.secondary}
                  />
                  <Text style={[
                    styles.permissionChipText,
                    permission === 'view' && { color: listColor, fontWeight: '600' },
                  ]}>
                    {t('sharing.viewOnly')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.inviteButton,
                  { backgroundColor: listColor },
                  (!email.trim().includes('@') || isInviting) && { opacity: 0.5 },
                ]}
                onPress={handleInvite}
                disabled={!email.trim().includes('@') || isInviting}
                activeOpacity={0.8}
              >
                {isInviting ? (
                  <ActivityIndicator color={COLORS.neutral.white} />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color={COLORS.neutral.white} />
                    <Text style={styles.inviteButtonText}>{t('sharing.invite')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Current members */}
            {members.length > 0 && (
              <View style={styles.membersSection}>
                <Text style={styles.sectionTitle}>
                  {t('sharing.members')} ({members.length})
                </Text>
                <FlatList
                  data={members}
                  renderItem={renderMember}
                  keyExtractor={(item) => item.id}
                  style={styles.membersList}
                  scrollEnabled={members.length > 3}
                />
              </View>
            )}

            {isLoadingMembers && members.length === 0 && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={listColor} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  inviteSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  emailInput: {
    backgroundColor: COLORS.neutral.gray100,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  permissionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  permissionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.gray200,
  },
  permissionChipText: {
    fontSize: 13,
    color: COLORS.text.primary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  membersSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.gray100,
    paddingTop: SPACING.lg,
  },
  membersList: {
    maxHeight: 200,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  permissionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionIcon: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
});
