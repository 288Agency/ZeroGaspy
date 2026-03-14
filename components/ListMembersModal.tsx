import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize } from '../utils/responsive';
import PressableScale from './PressableScale';
import {
  SharedMember,
  getSharedMembers,
  updatePermission,
  removeMember,
} from '../services/listSharingService';

interface ListMembersModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  isOwner: boolean;
}

export default function ListMembersModal({
  visible,
  onClose,
  listId,
  listTitle,
  isOwner,
}: ListMembersModalProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<SharedMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getSharedMembers(listId);
      setMembers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (member: SharedMember) => {
    if (!isOwner) return;

    const newPerm = member.permission === 'edit' ? 'view' : 'edit';
    const success = await updatePermission(member.shareId, newPerm);
    if (success) {
      setMembers(prev =>
        prev.map(m =>
          m.shareId === member.shareId ? { ...m, permission: newPerm } : m
        )
      );
    }
  };

  const handleRemoveMember = (member: SharedMember) => {
    if (!isOwner) return;

    Alert.alert(
      t('sharing.removeMemberTitle'),
      t('sharing.removeMemberConfirm', {
        name: member.displayName || member.email || t('sharing.unknownUser'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await removeMember(member.shareId);
            if (success) {
              setMembers(prev => prev.filter(m => m.shareId !== member.shareId));
            }
          },
        },
      ],
    );
  };

  const renderMember = ({ item }: { item: SharedMember }) => (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {(item.displayName || item.email || '?')[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {item.displayName || item.email || t('sharing.unknownUser')}
        </Text>
        <View style={styles.memberMeta}>
          <View style={[
            styles.permissionBadge,
            { backgroundColor: item.permission === 'edit'
              ? hexToRgba(COLORS.primary[500], 0.1)
              : hexToRgba(COLORS.neutral.gray500, 0.1)
            },
          ]}>
            <Ionicons
              name={item.permission === 'edit' ? 'create-outline' : 'eye-outline'}
              size={12}
              color={item.permission === 'edit' ? COLORS.primary[500] : COLORS.text.secondary}
            />
            <Text style={[
              styles.permissionBadgeText,
              { color: item.permission === 'edit' ? COLORS.primary[500] : COLORS.text.secondary },
            ]}>
              {item.permission === 'edit' ? t('sharing.canEdit') : t('sharing.canView')}
            </Text>
          </View>
          {item.status === 'pending' && (
            <Text style={styles.pendingText}>{t('sharing.pending')}</Text>
          )}
        </View>
      </View>

      {isOwner && (
        <View style={styles.memberActions}>
          <PressableScale
            onPress={() => handleTogglePermission(item)}
            style={styles.memberActionButton}
            hapticType="light"
          >
            <Ionicons
              name={item.permission === 'edit' ? 'eye-outline' : 'create-outline'}
              size={18}
              color={COLORS.text.secondary}
            />
          </PressableScale>
          <PressableScale
            onPress={() => handleRemoveMember(item)}
            style={styles.memberActionButton}
            hapticType="light"
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.semantic.dangerLight} />
          </PressableScale>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('sharing.membersTitle')}</Text>
              <Text style={styles.subtitle}>{listTitle}</Text>
            </View>
            <PressableScale onPress={onClose} hapticType="light">
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </PressableScale>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
            </View>
          ) : members.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.neutral.gray300} />
              <Text style={styles.emptyText}>{t('sharing.noMembers')}</Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={item => item.shareId}
              renderItem={renderMember}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    padding: scaleSpacing(24),
    paddingBottom: scaleSpacing(40),
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  subtitle: {
    fontSize: scaleFontSize(13),
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: SPACING['4xl'],
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: SPACING['4xl'],
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.muted,
  },
  listContent: {
    gap: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  memberAvatar: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  memberInitial: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  permissionBadgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  pendingText: {
    fontSize: scaleFontSize(11),
    color: COLORS.accent.gold,
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  memberActionButton: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
  },
});
