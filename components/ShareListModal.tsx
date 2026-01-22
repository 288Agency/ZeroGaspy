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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { generateInvitationCodeForList } from '../services/supabase/listSharingService';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

interface ShareListModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listTitle: string;
  userId: string;
}

export default function ShareListModal({
  visible,
  onClose,
  listId,
  listTitle,
  userId,
}: ShareListModalProps) {
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('edit');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Générer le code automatiquement à l'ouverture
  React.useEffect(() => {
    if (visible && !generatedCode) {
      handleGenerateCode();
    }
  }, [visible]);

  // Debug log
  React.useEffect(() => {
    console.log('ShareListModal - generatedCode:', generatedCode);
    console.log('ShareListModal - permission:', permission);
  }, [generatedCode, permission]);

  const handleGenerateCode = async () => {
    setIsLoading(true);
    try {
      const result = await generateInvitationCodeForList(listId, listTitle, userId, permission);

      if (result.success && result.invitationCode) {
        setGeneratedCode(result.invitationCode);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de générer le code');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!generatedCode) return;

    try {
      await Share.share({
        message: `Rejoins ma liste "${listTitle}" sur ZeroGaspy !\n\nCode d'invitation : ${generatedCode}\n\nTélécharge l'app et utilise ce code pour accéder à la liste partagée.`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handleShareLink = async () => {
    if (!generatedCode) return;

    const deepLink = `zerogaspy://join/${generatedCode}`;
    try {
      await Share.share({
        message: `Rejoins ma liste "${listTitle}" sur ZeroGaspy !\n\n${deepLink}\n\nOu utilise le code : ${generatedCode}`,
        url: deepLink,
      });
    } catch (error) {
      console.error('Erreur partage lien:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    await Clipboard.setStringAsync(generatedCode);
    Alert.alert('Copié !', 'Le code a été copié dans le presse-papiers');
  };

  const handleCopyLink = async () => {
    if (!generatedCode) return;

    const deepLink = `zerogaspy://join/${generatedCode}`;
    await Clipboard.setStringAsync(deepLink);
    Alert.alert('Copié !', 'Le lien a été copié dans le presse-papiers');
  };

  const handleChangePermission = async (newPermission: 'view' | 'edit' | 'admin') => {
    setPermission(newPermission);
    // Régénérer un nouveau code avec la nouvelle permission
    setIsLoading(true);
    try {
      const result = await generateInvitationCodeForList(listId, listTitle, userId, newPermission);

      if (result.success && result.invitationCode) {
        setGeneratedCode(result.invitationCode);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de générer le code');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateCode = () => {
    setGeneratedCode(null);
    handleGenerateCode();
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setPermission('edit');
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
            <Ionicons name="people" size={28} color={COLORS.primary[500]} />
            <Text style={styles.title}>Partager la liste</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{listTitle}</Text>

          {/* Loading or Code display */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
              <Text style={styles.loadingText}>Génération du code...</Text>
            </View>
          ) : generatedCode ? (
            <>
              {/* Code display */}
              <View style={styles.codeSection}>
                <Text style={styles.codeLabel}>Code d'invitation</Text>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                </View>
                <Text style={styles.codeHint}>Partagez ce code avec vos proches</Text>
              </View>

              {/* Permission selector */}
              <View style={styles.section}>
                <Text style={styles.label}>Permission</Text>
                <View style={{ flexDirection: 'row', marginHorizontal: -4 }}>
                  <TouchableOpacity
                    onPress={() => handleChangePermission('view')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      marginHorizontal: 4,
                      backgroundColor: permission === 'view' ? '#3C6E47' : '#FAFAFA',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: permission === 'view' ? '#3C6E47' : '#E0E0E0',
                    }}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name="eye-outline"
                      size={18}
                      color={permission === 'view' ? '#FFFFFF' : '#666666'}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600' as '600',
                        color: permission === 'view' ? '#FFFFFF' : '#666666',
                        marginLeft: 6,
                      }}
                    >
                      Voir
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleChangePermission('edit')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      marginHorizontal: 4,
                      backgroundColor: permission === 'edit' ? '#3C6E47' : '#FAFAFA',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: permission === 'edit' ? '#3C6E47' : '#E0E0E0',
                    }}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={permission === 'edit' ? '#FFFFFF' : '#666666'}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600' as '600',
                        color: permission === 'edit' ? '#FFFFFF' : '#666666',
                        marginLeft: 6,
                      }}
                    >
                      Modifier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleChangePermission('admin')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      marginHorizontal: 4,
                      backgroundColor: permission === 'admin' ? '#3C6E47' : '#FAFAFA',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: permission === 'admin' ? '#3C6E47' : '#E0E0E0',
                    }}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={permission === 'admin' ? '#FFFFFF' : '#666666'}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600' as '600',
                        color: permission === 'admin' ? '#FFFFFF' : '#666666',
                        marginLeft: 6,
                      }}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.permissionHint}>
                  {permission === 'view' && 'Peut uniquement voir les aliments'}
                  {permission === 'edit' && 'Peut ajouter et modifier les aliments'}
                  {permission === 'admin' && 'Peut gérer les membres et permissions'}
                </Text>
              </View>

              {/* Share buttons */}
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={handleCopyCode}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#757575',
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginRight: 6,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                  <Text
                    style={{ fontSize: 14, fontWeight: '600' as '600', color: '#FFFFFF', marginLeft: 8 }}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    Copier le code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShareLink}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#3C6E47',
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginLeft: 6,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                  <Text
                    style={{ fontSize: 14, fontWeight: '600' as '600', color: '#FFFFFF', marginLeft: 8 }}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    Partager le lien
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Regenerate button */}
              <TouchableOpacity onPress={handleRegenerateCode} style={styles.regenerateButton}>
                <Ionicons name="refresh-outline" size={16} color={COLORS.primary[500]} style={styles.regenerateIcon} />
                <Text style={styles.regenerateText}>Générer un nouveau code</Text>
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary[500]} style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  Les utilisateurs pourront rejoindre la liste en utilisant ce code ou le lien
                </Text>
              </View>
            </>
          ) : null}
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
    marginBottom: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  permissionButtons: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  permissionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  permissionButtonActive: {
    backgroundColor: '#3C6E47',
    borderColor: '#3C6E47',
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIcon: {
    marginRight: 6,
  },
  permissionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 6,
  },
  permissionTextActive: {
    color: '#FFFFFF',
  },
  permissionHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  codeSection: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  codeLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.primary[500],
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
  },
  codeText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary[500],
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  codeHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  shareButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#757575',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  shareButtonLeft: {
    marginRight: 6,
  },
  shareButtonRight: {
    marginLeft: 6,
  },
  shareButtonPrimary: {
    backgroundColor: '#3C6E47',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  regenerateIcon: {
    marginRight: 6,
  },
  regenerateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.md,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});
