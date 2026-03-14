import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSpacing, scaleFontSize } from '../utils/responsive';
import PressableScale from './PressableScale';
import { acceptInvitation, lookupInvitation } from '../services/listSharingService';

interface JoinListModalProps {
  visible: boolean;
  onClose: () => void;
  onJoined?: (listId: string, listTitle: string) => void;
}

export default function JoinListModal({
  visible,
  onClose,
  onJoined,
}: JoinListModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    listTitle: string;
    ownerName: string | null;
  } | null>(null);

  const handleLookup = async () => {
    if (code.length < 6) return;

    setLoading(true);
    try {
      const result = await lookupInvitation(code);
      if (result) {
        setPreview({
          listTitle: result.listTitle,
          ownerName: result.ownerName,
        });
      } else {
        Alert.alert(t('common.error'), t('sharing.invalidCode'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    try {
      const result = await acceptInvitation(code);

      if (result.success) {
        Alert.alert(
          t('common.success'),
          t('sharing.joinedSuccess', { title: result.listTitle }),
        );
        onJoined?.(result.listId!, result.listTitle!);
        handleClose();
      } else {
        const errorKey = `sharing.errors.${result.error}`;
        Alert.alert(t('common.error'), t(errorKey));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setPreview(null);
    onClose();
  };

  const handleCodeChange = (text: string) => {
    // Only uppercase alphanumeric, max 6
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    if (preview) setPreview(null);
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
            <Text style={styles.title}>{t('sharing.joinTitle')}</Text>
            <PressableScale onPress={handleClose} hapticType="light">
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </PressableScale>
          </View>

          <Text style={styles.description}>
            {t('sharing.joinDescription')}
          </Text>

          {/* Code input */}
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="ABCDEF"
            placeholderTextColor={COLORS.neutral.gray400}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
          />

          {/* Preview */}
          {preview && (
            <View style={styles.previewCard}>
              <Ionicons name="list-outline" size={24} color={COLORS.primary[500]} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{preview.listTitle}</Text>
                {preview.ownerName && (
                  <Text style={styles.previewOwner}>
                    {t('sharing.sharedBy', { name: preview.ownerName })}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Action button */}
          {!preview ? (
            <PressableScale
              onPress={handleLookup}
              style={[
                styles.actionButton,
                code.length < 6 && styles.actionButtonDisabled,
              ]}
              hapticType="medium"
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.neutral.white} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {t('sharing.lookupCode')}
                </Text>
              )}
            </PressableScale>
          ) : (
            <PressableScale
              onPress={handleJoin}
              style={styles.actionButton}
              hapticType="medium"
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.neutral.white} />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.actionButtonText}>
                    {t('sharing.joinList')}
                  </Text>
                </>
              )}
            </PressableScale>
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
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  description: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    lineHeight: scaleFontSize(20),
  },
  codeInput: {
    fontSize: scaleFontSize(32),
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: 8,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.successBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.semantic.success, 0.2),
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  previewOwner: {
    fontSize: scaleFontSize(13),
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});
