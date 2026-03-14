import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from './PressableScale';
import { generateInvitationCode } from '../services/listSharingService';

interface ShareListModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  onShareCreated?: () => void;
}

export default function ShareListModal({
  visible,
  onClose,
  listId,
  listTitle,
  onShareCreated,
}: ShareListModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [permission, setPermission] = useState<'view' | 'edit'>('edit');
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const result = await generateInvitationCode(listId, permission);
      if (result) {
        setCode(result.code);
        onShareCreated?.();
      } else {
        Alert.alert(t('common.error'), t('sharing.generateError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: t('sharing.shareMessage', { code, title: listTitle }),
      });
    } catch {
      // User cancelled
    }
  };

  const handleClose = () => {
    setCode(null);
    setCopied(false);
    setPermission('edit');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('sharing.shareTitle')}</Text>
            <PressableScale onPress={handleClose} hapticType="light">
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </PressableScale>
          </View>

          <Text style={styles.listName}>{listTitle}</Text>

          {!code ? (
            <>
              {/* Permission selector */}
              <Text style={styles.sectionLabel}>{t('sharing.permissionLabel')}</Text>
              <View style={styles.permissionRow}>
                <PressableScale
                  onPress={() => setPermission('edit')}
                  style={[
                    styles.permissionOption,
                    permission === 'edit' && styles.permissionOptionActive,
                  ]}
                  hapticType="light"
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={permission === 'edit' ? COLORS.primary[500] : COLORS.text.secondary}
                  />
                  <Text
                    style={[
                      styles.permissionText,
                      permission === 'edit' && styles.permissionTextActive,
                    ]}
                  >
                    {t('sharing.canEdit')}
                  </Text>
                </PressableScale>

                <PressableScale
                  onPress={() => setPermission('view')}
                  style={[
                    styles.permissionOption,
                    permission === 'view' && styles.permissionOptionActive,
                  ]}
                  hapticType="light"
                >
                  <Ionicons
                    name="eye-outline"
                    size={20}
                    color={permission === 'view' ? COLORS.primary[500] : COLORS.text.secondary}
                  />
                  <Text
                    style={[
                      styles.permissionText,
                      permission === 'view' && styles.permissionTextActive,
                    ]}
                  >
                    {t('sharing.canView')}
                  </Text>
                </PressableScale>
              </View>

              {/* Generate button */}
              <PressableScale
                onPress={handleGenerateCode}
                style={styles.generateButton}
                hapticType="medium"
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.neutral.white} />
                ) : (
                  <>
                    <Ionicons name="link-outline" size={20} color={COLORS.neutral.white} />
                    <Text style={styles.generateButtonText}>
                      {t('sharing.generateCode')}
                    </Text>
                  </>
                )}
              </PressableScale>
            </>
          ) : (
            <>
              {/* Code display */}
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>{t('sharing.invitationCode')}</Text>
                <Text style={styles.codeText}>{code}</Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <PressableScale
                  onPress={handleCopy}
                  style={styles.actionButton}
                  hapticType="light"
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color={COLORS.primary[500]}
                  />
                  <Text style={styles.actionButtonText}>
                    {copied ? t('sharing.copied') : t('sharing.copy')}
                  </Text>
                </PressableScale>

                <PressableScale
                  onPress={handleShare}
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  hapticType="medium"
                >
                  <Ionicons name="share-outline" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.actionButtonPrimaryText}>
                    {t('sharing.share')}
                  </Text>
                </PressableScale>
              </View>

              <Text style={styles.hint}>{t('sharing.codeHint')}</Text>
            </>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  listName: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING['2xl'],
  },
  permissionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.gray200,
    backgroundColor: COLORS.neutral.white,
  },
  permissionOptionActive: {
    borderColor: COLORS.primary[500],
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
  },
  permissionText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  permissionTextActive: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  generateButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
  },
  codeLabel: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.tertiary,
    fontWeight: '500',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: scaleFontSize(36),
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary[500],
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  actionButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  actionButtonPrimaryText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  hint: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: scaleFontSize(16),
  },
});
