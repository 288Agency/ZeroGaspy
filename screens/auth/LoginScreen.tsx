import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import PressableScale from '../../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS } from '../../utils/designSystem';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, skipAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Erreur de connexion', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Mode local',
      'Vos donnees seront stockees uniquement sur cet appareil. Vous pourrez creer un compte plus tard pour sauvegarder dans le cloud.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: skipAuth },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo et titre */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="leaf" size={48} color={COLORS.secondary.cream} />
          </View>
          <Text style={styles.title}>ZeroGaspy</Text>
          <Text style={styles.subtitle}>Connectez-vous a votre compte</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
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
                placeholder="Votre mot de passe"
                placeholderTextColor={COLORS.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
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
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublie ?</Text>
          </TouchableOpacity>

          {/* Bouton connexion */}
          <PressableScale
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.loginButton}
            hapticType="medium"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.neutral.white} />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </PressableScale>

          {/* Lien inscription */}
          <View style={styles.registerLink}>
            <Text style={styles.registerLinkText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkBold}>S'inscrire</Text>
            </TouchableOpacity>
          </View>

          {/* Mode local */}
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Continuer sans compte</Text>
          </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: -1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 8,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  loginButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  registerLinkText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  registerLinkBold: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary[500],
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.muted,
    textDecorationLine: 'underline',
  },
});
