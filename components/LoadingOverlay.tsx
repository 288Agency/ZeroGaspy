import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-100 pour une barre de progression
}

/**
 * Overlay de chargement réutilisable avec message optionnel et progression
 * Utilisé pour les opérations longues comme les scans de tickets
 */
export default function LoadingOverlay({
  visible,
  message,
  progress,
}: LoadingOverlayProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t('loadingOverlay.loading');
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />

          {displayMessage && (
            <Text style={styles.message}>{displayMessage}</Text>
          )}

          {progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, progress))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: SPACING['3xl'],
    minWidth: 200,
    alignItems: 'center',
    shadowColor: COLORS.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: SPACING.lg,
    fontSize: 16,
    color: COLORS.neutral.gray800,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: SPACING.lg,
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.neutral.gray300,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 4,
  },
  progressText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
});
