import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';

interface CreateOrJoinModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateList: () => void;
  onJoinList: () => void;
  isAuthenticated: boolean;
}

export default function CreateOrJoinModal({
  visible,
  onClose,
  onCreateList,
  onJoinList,
  isAuthenticated,
}: CreateOrJoinModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter une liste</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Créez une nouvelle liste ou rejoignez une liste partagée
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Create new list */}
            <PressableScale
              onPress={() => {
                onClose();
                onCreateList();
              }}
              style={styles.optionCard}
              hapticType="medium"
              activeScale={0.97}
            >
              <View style={[styles.optionIcon, { backgroundColor: hexToRgba(COLORS.primary[500], 0.15) }]}>
                <Ionicons name="add-circle" size={32} color={COLORS.primary[500]} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Créer une liste</Text>
                <Text style={styles.optionDescription}>
                  Créez un nouvel espace pour organiser vos aliments
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
            </PressableScale>

            {/* Join shared list - only if authenticated */}
            {isAuthenticated && (
              <PressableScale
                onPress={() => {
                  onClose();
                  onJoinList();
                }}
                style={styles.optionCard}
                hapticType="medium"
                activeScale={0.97}
              >
                <View style={[styles.optionIcon, { backgroundColor: hexToRgba('#6366F1', 0.15) }]}>
                  <Ionicons name="enter" size={32} color="#6366F1" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Rejoindre une liste</Text>
                  <Text style={styles.optionDescription}>
                    Entrez un code d'invitation pour accéder à une liste partagée
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
              </PressableScale>
            )}
          </View>

          {/* Info for non-authenticated users */}
          {!isAuthenticated && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary[500]} />
              <Text style={styles.infoText}>
                Connectez-vous pour rejoindre des listes partagées
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.neutral.gray300, 0.3),
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.md,
    marginTop: 16,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});
