import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { acceptInvitationByCode } from '../services/supabase/listSharingService';

interface AcceptInvitationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (listId: string) => void;
  initialCode?: string;
}

export default function AcceptInvitationModal({
  visible,
  onClose,
  userId,
  onSuccess,
  initialCode,
}: AcceptInvitationModalProps) {
  const [code, setCode] = useState(initialCode || '');
  const [isLoading, setIsLoading] = useState(false);

  // Mettre à jour le code quand initialCode change
  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleAccept = async () => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code d\'invitation');
      return;
    }

    setIsLoading(true);
    try {
      const result = await acceptInvitationByCode(userId, code.trim());

      if (result.success && result.listId) {
        Alert.alert(
          'Succès !',
          'Vous avez rejoint la liste partagée',
          [
            {
              text: 'OK',
              onPress: () => {
                setCode('');
                onClose();
                if (result.listId) {
                  onSuccess(result.listId);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Code d\'invitation invalide');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-open" size={32} color={COLORS.primary[500]} />
            </View>
            <Text style={styles.title}>Rejoindre une liste</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Entrez le code d'invitation que vous avez reçu pour accéder à une liste partagée
          </Text>

          {/* Code input */}
          <View style={styles.codeInputContainer}>
            <Text style={styles.label}>Code d'invitation</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="ABC123"
              placeholderTextColor={COLORS.text.muted}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!isLoading}
            />
            <Text style={styles.hint}>6 caractères (lettres et chiffres)</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <PressableScale
              onPress={handleClose}
              style={styles.cancelButton}
              hapticType="light"
              activeScale={0.97}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </PressableScale>

            <PressableScale
              onPress={handleAccept}
              style={[styles.acceptButton, isLoading && styles.acceptButtonDisabled]}
              hapticType="medium"
              activeScale={0.97}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.neutral.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.acceptButtonText}>Rejoindre</Text>
                </>
              )}
            </PressableScale>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary[500]} />
            <Text style={styles.infoText}>
              Vous pourrez voir et modifier les aliments selon les permissions qui vous sont accordées
            </Text>
          </View>
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
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 8,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  codeInputContainer: {
    marginBottom: 24,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  codeInput: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    paddingVertical: 16,
    paddingHorizontal: 20,
    letterSpacing: 4,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.gray50,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.neutral.gray300, 0.5),
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.secondary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.md,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});
