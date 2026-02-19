import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface AccountSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

type SettingsSection = 'main' | 'name' | 'email' | 'password' | 'delete';

export default function AccountSettingsModal({ visible, onClose }: AccountSettingsModalProps) {
  const { t } = useTranslation();
  const { user, updateProfile, updateEmail, updatePassword, deleteAccount, refreshUser } = useAuth();
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  const [isLoading, setIsLoading] = useState(false);

  // Champs pour modification du nom
  const [fullName, setFullName] = useState('');

  // Champs pour modification de l'email
  const [newEmail, setNewEmail] = useState('');

  // Champs pour modification du mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Champs pour suppression de compte
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (visible && user) {
      setFullName(user.user_metadata?.full_name || '');
      setNewEmail(user.email || '');
      setCurrentSection('main');
    }
  }, [visible, user]);

  const handleClose = () => {
    setCurrentSection('main');
    setNewPassword('');
    setConfirmPassword('');
    setDeleteConfirmation('');
    setShowPassword(false);
    onClose();
  };

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('accountSettings.errorEnterName'));
      return;
    }

    setIsLoading(true);
    const { error } = await updateProfile({ fullName: fullName.trim() });
    setIsLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      await refreshUser();
      Alert.alert(t('common.success'), t('accountSettings.nameUpdated'));
      setCurrentSection('main');
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert(t('common.error'), t('accountSettings.errorEnterEmail'));
      return;
    }

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      Alert.alert(t('common.error'), t('accountSettings.errorSameEmail'));
      return;
    }

    setIsLoading(true);
    const { error } = await updateEmail(newEmail.trim());
    setIsLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(
        t('accountSettings.emailConfirmSent'),
        t('accountSettings.emailConfirmSentDesc'),
        [{ text: t('common.ok'), onPress: () => setCurrentSection('main') }]
      );
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('accountSettings.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('accountSettings.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('accountSettings.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
      setCurrentSection('main');
    }
  };

  const deleteConfirmWord = t('accountSettings.deleteConfirmWord');

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== deleteConfirmWord) {
      Alert.alert(t('common.error'), t('accountSettings.errorTypeDelete'));
      return;
    }

    Alert.alert(
      t('accountSettings.finalConfirmation'),
      t('accountSettings.finalConfirmationDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accountSettings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const { error } = await deleteAccount();
            setIsLoading(false);

            if (error) {
              Alert.alert(t('common.error'), error.message);
            } else {
              handleClose();
            }
          },
        },
      ]
    );
  };

  const renderMainSection = () => (
    <View>
      <Text style={styles.mainTitle}>
        {t('accountSettings.title')}
      </Text>

      {/* Info utilisateur */}
      <View style={styles.userInfoBox}>
        <View style={styles.rowCenter}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.userName}>
              {user?.user_metadata?.full_name || t('accountSettings.user')}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsGap}>
        <PressableScale
          onPress={() => setCurrentSection('name')}
          style={styles.optionCard}
          hapticType="light"
        >
          <View style={styles.optionIcon}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary[500]} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.optionTitle}>{t('accountSettings.changeName')}</Text>
            <Text style={styles.optionSubtitle}>{t('accountSettings.changeNameDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </PressableScale>

        <PressableScale
          onPress={() => setCurrentSection('email')}
          style={styles.optionCard}
          hapticType="light"
        >
          <View style={styles.optionIcon}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary[500]} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.optionTitle}>{t('accountSettings.changeEmail')}</Text>
            <Text style={styles.optionSubtitle}>{t('accountSettings.changeEmailDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </PressableScale>

        <PressableScale
          onPress={() => setCurrentSection('password')}
          style={styles.optionCard}
          hapticType="light"
        >
          <View style={styles.optionIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary[500]} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.optionTitle}>{t('accountSettings.changePassword')}</Text>
            <Text style={styles.optionSubtitle}>{t('accountSettings.changePasswordDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </PressableScale>

        <View style={styles.spacer} />

        <PressableScale
          onPress={() => setCurrentSection('delete')}
          style={styles.deleteCard}
          hapticType="medium"
        >
          <View style={styles.deleteIcon}>
            <Ionicons name="trash-outline" size={20} color={COLORS.semantic.dangerLight} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.deleteTitle}>{t('accountSettings.deleteAccount')}</Text>
            <Text style={styles.deleteSubtitle}>{t('accountSettings.deleteAccountDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.semantic.dangerLight} />
        </PressableScale>
      </View>
    </View>
  );

  const renderNameSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('accountSettings.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {t('accountSettings.changeName')}
      </Text>

      <Text style={styles.fieldLabel}>{t('accountSettings.fullName')}</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('accountSettings.yourName')}
        style={styles.textInput}
        placeholderTextColor={COLORS.text.tertiary}
        autoCapitalize="words"
      />

      <PressableScale
        onPress={handleUpdateName}
        style={styles.primaryButton}
        hapticType="medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.neutral.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('accountSettings.save')}</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderEmailSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('accountSettings.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {t('accountSettings.changeEmail')}
      </Text>

      <View style={styles.warningBox}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.semantic.warningDark} />
        <Text style={styles.warningText}>
          {t('accountSettings.emailConfirmationWarning')}
        </Text>
      </View>

      <Text style={styles.fieldLabel}>{t('accountSettings.currentEmail')}</Text>
      <Text style={styles.currentEmailText}>{user?.email}</Text>

      <Text style={styles.fieldLabel}>{t('accountSettings.newEmail')}</Text>
      <TextInput
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder={t('accountSettings.newEmailPlaceholder')}
        style={styles.textInput}
        placeholderTextColor={COLORS.text.tertiary}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PressableScale
        onPress={handleUpdateEmail}
        style={styles.primaryButton}
        hapticType="medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.neutral.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('accountSettings.sendConfirmationLink')}</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderPasswordSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('accountSettings.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {t('accountSettings.changePassword')}
      </Text>

      <Text style={styles.fieldLabel}>{t('accountSettings.newPassword')}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('accountSettings.minChars')}
          style={styles.passwordInput}
          placeholderTextColor={COLORS.text.tertiary}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>{t('accountSettings.confirmPassword')}</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('accountSettings.retypePassword')}
        style={styles.textInput}
        placeholderTextColor={COLORS.text.tertiary}
        secureTextEntry={!showPassword}
      />

      {newPassword.length > 0 && newPassword.length < 6 && (
        <Text style={styles.errorText}>
          {t('accountSettings.passwordTooShort')}
        </Text>
      )}

      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
        <Text style={styles.errorText}>
          {t('accountSettings.passwordMismatch')}
        </Text>
      )}

      <PressableScale
        onPress={handleUpdatePassword}
        style={styles.primaryButton}
        hapticType="medium"
        disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.neutral.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('accountSettings.updatePassword')}</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderDeleteSection = () => (
    <View>
      <TouchableOpacity
        onPress={() => setCurrentSection('main')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('accountSettings.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.deleteSectionTitle}>
        {t('accountSettings.deleteAccount')}
      </Text>

      <View style={styles.dangerBox}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning-outline" size={24} color={COLORS.semantic.dangerLight} />
          <Text style={styles.dangerHeaderText}>
            {t('accountSettings.deleteWarning')}
          </Text>
        </View>
        <Text style={styles.dangerBodyText}>
          {t('accountSettings.deleteConsequences')}
        </Text>
        <View style={styles.dangerList}>
          <Text style={styles.dangerListItem}>• {t('accountSettings.deleteLists')}</Text>
          <Text style={styles.dangerListItem}>• {t('accountSettings.deleteHistory')}</Text>
          <Text style={styles.dangerListItem}>• {t('accountSettings.deleteStats')}</Text>
          <Text style={styles.dangerListItem}>• {t('accountSettings.deleteSettings')}</Text>
        </View>
      </View>

      <Text style={styles.fieldLabel}>
        {t('accountSettings.deleteConfirmLabel')}
      </Text>
      <TextInput
        value={deleteConfirmation}
        onChangeText={setDeleteConfirmation}
        placeholder={t('accountSettings.deleteConfirmPlaceholder')}
        style={styles.deleteInput}
        placeholderTextColor={`${COLORS.semantic.dangerLight}80`}
        autoCapitalize="characters"
      />

      <PressableScale
        onPress={handleDeleteAccount}
        style={[
          styles.deleteButton,
          deleteConfirmation === deleteConfirmWord ? styles.deleteButtonActive : styles.deleteButtonInactive,
        ]}
        hapticType="heavy"
        disabled={isLoading || deleteConfirmation !== deleteConfirmWord}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.neutral.white} />
        ) : (
          <Text style={styles.deleteButtonText}>
            {t('accountSettings.deletePermanently')}
          </Text>
        )}
      </PressableScale>
    </View>
  );

  const renderContent = () => {
    switch (currentSection) {
      case 'name':
        return renderNameSection();
      case 'email':
        return renderEmailSection();
      case 'password':
        return renderPasswordSection();
      case 'delete':
        return renderDeleteSection();
      default:
        return renderMainSection();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerHandle} />
          <TouchableOpacity onPress={handleClose} style={styles.headerCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  headerSpacer: {
    width: 40,
  },
  headerHandle: {
    width: 40,
    height: 4,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.full,
  },
  headerCloseButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  flex1: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
  },
  userInfoBox: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  userAvatarText: {
    color: COLORS.neutral.white,
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  userEmail: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  optionsGap: {
    gap: SPACING.md,
  },
  optionCard: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionTitle: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  optionSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  spacer: {
    height: SPACING.lg,
  },
  deleteCard: {
    backgroundColor: COLORS.surface.dangerBgLight,
    borderWidth: 1,
    borderColor: COLORS.surface.dangerBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface.dangerBgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  deleteTitle: {
    color: COLORS.semantic.danger,
    fontWeight: '600',
  },
  deleteSubtitle: {
    color: COLORS.semantic.dangerMuted,
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING['2xl'],
  },
  fieldLabel: {
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.secondary.cream,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.primary[500],
    marginBottom: SPACING['2xl'],
  },
  primaryButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: COLORS.surface.warningBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    color: COLORS.semantic.warningDark,
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  currentEmailText: {
    color: COLORS.primary[500],
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.cream,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.primary[500],
  },
  eyeButton: {
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    color: COLORS.semantic.danger,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  deleteSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.semantic.danger,
    marginBottom: SPACING.lg,
  },
  dangerBox: {
    backgroundColor: COLORS.surface.dangerBgLight,
    borderWidth: 1,
    borderColor: COLORS.surface.dangerBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  dangerHeaderText: {
    color: COLORS.semantic.dangerDark,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    flex: 1,
  },
  dangerBodyText: {
    color: COLORS.semantic.danger,
    fontSize: 14,
  },
  dangerList: {
    marginTop: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  dangerListItem: {
    color: COLORS.semantic.danger,
    fontSize: 14,
  },
  deleteInput: {
    backgroundColor: COLORS.surface.dangerBgLight,
    borderWidth: 1,
    borderColor: COLORS.surface.dangerBorder,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.semantic.danger,
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
    fontWeight: '700',
  },
  deleteButton: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  deleteButtonActive: {
    backgroundColor: COLORS.semantic.danger,
  },
  deleteButtonInactive: {
    backgroundColor: COLORS.surface.dangerBorder,
  },
  deleteButtonText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
});
