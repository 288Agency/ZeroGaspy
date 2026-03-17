import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { useAuth } from '../../contexts/AuthContext';
import PressableScale from '../../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, SPACING } from '../../utils/designSystem';
import { validatePassword } from '../../utils/security';

const TERMS_URL = 'https://www.zerogaspy.fr/terms/';
const PRIVACY_URL = 'https://www.zerogaspy.fr/privacy/';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { signUp, signInWithApple } = useAuth();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // Validation du mot de passe en temps reel
  const passwordValidation = validatePassword(password);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('auth.nameRequired'));
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmailFormat'));
      return false;
    }
    if (!passwordValidation.isValid) {
      Alert.alert(t('auth.passwordInvalid'), passwordValidation.errors.join('\n'));
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return false;
    }
    if (!acceptTerms) {
      Alert.alert(t('common.error'), t('auth.acceptTermsRequired'));
      return false;
    }
    return true;
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error } = await signInWithApple();
      if (error) {
        Alert.alert(t('auth.appleSignInError'), error.message);
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (error.message === 'USER_ALREADY_EXISTS') {
          Alert.alert(
            t('auth.emailAlreadyUsedTitle'),
            t('auth.emailAlreadyUsedMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('auth.signIn'), onPress: () => navigation.goBack() },
            ]
          );
        } else {
          Alert.alert(t('common.error'), error.message);
        }
      } else {
        Alert.alert(
          t('auth.accountCreated'),
          t('auth.confirmEmail'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header avec bouton retour */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('auth.registerTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.registerSubtitle')}
        </Text>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.fullName')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.namePlaceholder')}
                placeholderTextColor={COLORS.text.muted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.text.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.minChars')}
                placeholderTextColor={COLORS.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.text.muted}
                />
              </TouchableOpacity>
            </View>
            {/* Indicateur de force du mot de passe */}
            {password.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBars}>
                  <View style={[styles.strengthBar, passwordValidation.strength !== 'weak' && styles.strengthBarWeak]} />
                  <View style={[styles.strengthBar, passwordValidation.strength === 'medium' && styles.strengthBarMedium, passwordValidation.strength === 'strong' && styles.strengthBarMedium]} />
                  <View style={[styles.strengthBar, passwordValidation.strength === 'strong' && styles.strengthBarStrong]} />
                </View>
                <Text style={[
                  styles.strengthText,
                  passwordValidation.strength === 'weak' && styles.strengthTextWeak,
                  passwordValidation.strength === 'medium' && styles.strengthTextMedium,
                  passwordValidation.strength === 'strong' && styles.strengthTextStrong,
                ]}>
                  {passwordValidation.strength === 'weak' ? t('auth.passwordWeak') : passwordValidation.strength === 'medium' ? t('auth.passwordMedium') : t('auth.passwordStrong')}
                </Text>
              </View>
            )}
            {password.length > 0 && !passwordValidation.isValid && (
              <Text style={styles.passwordHint}>
                {t('auth.passwordHint')}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.retypePassword')}
                placeholderTextColor={COLORS.text.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* Checkbox CGU */}
          <TouchableOpacity
            onPress={() => setAcceptTerms(!acceptTerms)}
            style={styles.checkboxRow}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Ionicons name="checkmark" size={16} color={COLORS.neutral.white} />}
            </View>
            <Text style={styles.checkboxText}>
              {t('auth.acceptTermsText')}{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>{t('auth.termsOfUse')}</Text>
              {' '}{t('auth.andThe')}{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>{t('auth.privacyPolicy')}</Text>
            </Text>
          </TouchableOpacity>

          {/* Bouton inscription */}
          <PressableScale
            onPress={handleRegister}
            disabled={isLoading}
            style={styles.registerButton}
            hapticType="medium"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.neutral.white} />
            ) : (
              <Text style={styles.registerButtonText}>{t('auth.createMyAccount')}</Text>
            )}
          </PressableScale>

          {/* Connexion Apple - iOS uniquement */}
          {Platform.OS === 'ios' && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={RADIUS.xl}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </>
          )}

          {/* Lien connexion */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>{t('auth.hasAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLinkBold}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  headerBar: {
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING['2xl'],
    paddingBottom: SPACING['4xl'],
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING['3xl'],
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.xl,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary[500],
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primary[100],
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.sm,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: SPACING.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  checkboxText: {
    flex: 1,
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  link: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.primary[100],
  },
  dividerText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.muted,
    marginHorizontal: SPACING.lg,
  },
  appleButton: {
    height: 54,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  registerButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  registerButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginLinkText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  loginLinkBold: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary[500],
    fontWeight: '700',
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: SPACING.xs,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray200,
  },
  strengthBarWeak: {
    backgroundColor: COLORS.semantic.dangerLight,
  },
  strengthBarMedium: {
    backgroundColor: COLORS.accent.gold,
  },
  strengthBarStrong: {
    backgroundColor: COLORS.semantic.successLight,
  },
  strengthText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  strengthTextWeak: {
    color: COLORS.semantic.dangerLight,
  },
  strengthTextMedium: {
    color: COLORS.accent.gold,
  },
  strengthTextStrong: {
    color: COLORS.semantic.successLight,
  },
  passwordHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginTop: SPACING.xs,
  },
});
