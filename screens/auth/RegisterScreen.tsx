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
import { useAuth } from '../../contexts/AuthContext';
import PressableScale from '../../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS } from '../../utils/designSystem';
import { validatePassword } from '../../utils/security';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Validation du mot de passe en temps reel
  const passwordValidation = validatePassword(password);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Erreur', 'Format d\'email invalide');
      return false;
    }
    if (!passwordValidation.isValid) {
      Alert.alert('Mot de passe invalide', passwordValidation.errors.join('\n'));
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }
    if (!acceptTerms) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions d\'utilisation');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        Alert.alert(
          'Compte cree !',
          'Un email de confirmation vous a ete envoye. Verifiez votre boite mail pour activer votre compte.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
        <Text style={styles.title}>Creer un compte</Text>
        <Text style={styles.subtitle}>
          Rejoignez ZeroGaspy et sauvegardez vos donnees dans le cloud
        </Text>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                placeholderTextColor={COLORS.text.muted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
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
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 caracteres"
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
                  {passwordValidation.strength === 'weak' ? 'Faible' : passwordValidation.strength === 'medium' ? 'Moyen' : 'Fort'}
                </Text>
              </View>
            )}
            {password.length > 0 && !passwordValidation.isValid && (
              <Text style={styles.passwordHint}>
                Requis: majuscule, minuscule, chiffre, 8+ caracteres
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Retapez votre mot de passe"
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
              J'accepte les{' '}
              <Text style={styles.link}>conditions d'utilisation</Text>
              {' '}et la{' '}
              <Text style={styles.link}>politique de confidentialite</Text>
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
              <Text style={styles.registerButtonText}>Creer mon compte</Text>
            )}
          </PressableScale>

          {/* Lien connexion */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Deja un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLinkBold}>Se connecter</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary[500],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primary[100],
    paddingHorizontal: 16,
    ...SHADOWS.sm,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  registerButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
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
    marginTop: 8,
    gap: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray200,
  },
  strengthBarWeak: {
    backgroundColor: '#EF4444',
  },
  strengthBarMedium: {
    backgroundColor: '#F59E0B',
  },
  strengthBarStrong: {
    backgroundColor: '#10B981',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  strengthTextWeak: {
    color: '#EF4444',
  },
  strengthTextMedium: {
    color: '#F59E0B',
  },
  strengthTextStrong: {
    color: '#10B981',
  },
  passwordHint: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 4,
  },
});
