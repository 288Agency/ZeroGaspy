import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import PressableScale from '../../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS } from '../../utils/designSystem';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        setEmailSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={56} color={COLORS.primary[500]} />
          </View>
          <Text style={styles.successTitle}>Email envoye !</Text>
          <Text style={styles.successText}>
            Verifiez votre boite mail et cliquez sur le lien pour reinitialiser votre mot de passe.
          </Text>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backToLoginButton}
            hapticType="medium"
          >
            <Text style={styles.backToLoginText}>Retour a la connexion</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Mot de passe oublie ?</Text>
        <Text style={styles.subtitle}>
          Entrez votre email et nous vous enverrons un lien pour reinitialiser votre mot de passe.
        </Text>

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

        <PressableScale
          onPress={handleResetPassword}
          disabled={isLoading}
          style={styles.resetButton}
          hapticType="medium"
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.neutral.white} />
          ) : (
            <Text style={styles.resetButtonText}>Envoyer le lien</Text>
          )}
        </PressableScale>
      </View>
    </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 28,
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
  resetButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  resetButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary[500],
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    paddingHorizontal: 32,
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  backToLoginText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
});
