// ============================================================================
// ZeroGaspy Design System · Modal (alert / confirm UNIQUEMENT)
// ============================================================================
// Pour confirmations destructives + messages bloquants. Tout le reste = BottomSheet.
// Max 2 actions. Backdrop opaque (pas de blur — l'utilisateur doit savoir
// qu'il est bloqué).
//
// Usage :
//   <AlertModal
//     visible={open}
//     onClose={() => setOpen(false)}
//     icon="trash"
//     tone="danger"
//     title="Jeter cet aliment ?"
//     message="Yaourt nature Danone (4 pots) sera marqué comme jeté."
//     primaryLabel="Jeter"
//     onPrimary={confirm}
//     secondaryLabel="Annuler"
//   />
// ============================================================================

import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import Button from './Button';

export type AlertTone = 'default' | 'danger' | 'success' | 'warning' | 'reward';

export interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: SymbolViewProps['name'];
  tone?: AlertTone;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function AlertModal({
  visible,
  onClose,
  title,
  message,
  icon,
  tone = 'default',
  primaryLabel,
  onPrimary,
  primaryLoading,
  secondaryLabel = 'Annuler',
  onSecondary,
}: AlertModalProps) {
  const { colors, typography, radius, componentRadius, elevation, space } = useTheme();

  const iconColor =
    tone === 'danger'
      ? colors.feedback.danger.solid
      : tone === 'warning'
      ? colors.feedback.warning.solid
      : tone === 'success'
      ? colors.feedback.success.solid
      : tone === 'reward'
      ? colors.feedback.reward.solid
      : colors.fg.primary;

  const iconBg =
    tone === 'danger'
      ? colors.feedback.danger.bg
      : tone === 'warning'
      ? colors.feedback.warning.bg
      : tone === 'success'
      ? colors.feedback.success.bg
      : tone === 'reward'
      ? colors.feedback.reward.bg
      : colors.bg.sunken;

  const handleSecondary = () => {
    onSecondary?.();
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={[styles.backdrop, { backgroundColor: 'rgba(14,13,11,0.7)' }]}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.modal,
            {
              backgroundColor: colors.bg.surface,
              borderRadius: componentRadius.modal,
              ...elevation[5],
            },
          ]}
        >
          {icon && (
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: iconBg,
                  borderRadius: radius.md,
                  marginBottom: space[3],
                },
              ]}
            >
              <SymbolView name={icon} size={22} tintColor={iconColor} />
            </View>
          )}

          <Text
            style={[
              typography.title3,
              { color: colors.fg.primary, textAlign: 'center', marginBottom: space[2] },
            ]}
          >
            {title}
          </Text>

          {message && (
            <Text
              style={[
                typography.body,
                { color: colors.fg.secondary, textAlign: 'center', marginBottom: space[5] },
              ]}
            >
              {message}
            </Text>
          )}

          <View style={[styles.actions, { gap: space[2] }]}>
            {secondaryLabel && (
              <View style={styles.actionFlex}>
                <Button variant="secondary" size="md" onPress={handleSecondary}>
                  {secondaryLabel}
                </Button>
              </View>
            )}
            {primaryLabel && (
              <View style={styles.actionFlex}>
                <Button
                  variant="primary"
                  size="md"
                  tone={tone === 'danger' ? 'destructive' : 'default'}
                  loading={primaryLoading}
                  onPress={onPrimary}
                >
                  {primaryLabel}
                </Button>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  actionFlex: {
    flex: 1,
  },
});
