// ============================================================================
// ZeroGaspy Design System · DeferredAuthSheet
// ============================================================================
// Sheet non-bloquante demandant la création de compte AU BON MOMENT — pas
// au start de l'app. Triggered lors d'une action qui A BESOIN du cloud :
// partage de liste, sync multi-device, restore après réinstall.
//
// Pattern qui répare le drop-off massif RegisterScreen :
//   · L'onboarding ne demande JAMAIS de compte (local-first, déjà partiel
//     dans isLocalMode)
//   · Quand l'utilisateur tente une action qui requiert l'auth → cette sheet
//   · Apple sign-in mis en avant (1-tap, conforme HIG)
//   · Email = fallback, pas premier choix
//   · "Plus tard" toujours visible → l'utilisateur peut dismiss et l'action
//     reste en local
//
// Usage :
//   <DeferredAuthSheet
//     visible={open}
//     onClose={() => setOpen(false)}
//     reason="share"
//     onAppleSignIn={...}
//     onGoogleSignIn={...}
//     onEmailSignUp={() => navigate('Register')}
//     onSkip={() => { keepLocal(); setOpen(false); }}
//   />
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import BottomSheet from './BottomSheet';
import Button from './Button';

export type AuthReason = 'share' | 'sync' | 'backup' | 'family';

const REASON_COPY: Record<AuthReason, { icon: any; title: string; sub: string }> = {
  share: {
    icon: 'person.2.fill',
    title: 'Partage avec ta famille',
    sub: 'Crée un compte pour inviter les membres de ton foyer à ton frigo.',
  },
  sync: {
    icon: 'arrow.triangle.2.circlepath',
    title: 'Retrouve ton frigo partout',
    sub: 'Synchronise tes aliments sur tous tes appareils.',
  },
  backup: {
    icon: 'icloud.fill',
    title: 'Sauvegarde tes données',
    sub: 'Ne perds rien si tu changes de téléphone ou réinstalles l\'app.',
  },
  family: {
    icon: 'house.fill',
    title: 'Active le mode foyer',
    sub: 'Partagez le frigo, ajoutez à plusieurs, sans doublons.',
  },
};

export interface DeferredAuthSheetProps {
  visible: boolean;
  onClose: () => void;
  reason: AuthReason;
  onAppleSignIn?: () => void;
  onGoogleSignIn?: () => void;
  onEmailSignUp?: () => void;
  /** L'utilisateur skip — l'action courante doit rester en local */
  onSkip?: () => void;
}

export default function DeferredAuthSheet({
  visible,
  onClose,
  reason,
  onAppleSignIn,
  onGoogleSignIn,
  onEmailSignUp,
  onSkip,
}: DeferredAuthSheetProps) {
  const { colors, typography, space, radius, componentRadius } = useTheme();
  const copy = REASON_COPY[reason];

  const handleSkip = () => {
    onSkip?.();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable>
      {/* Icon hero */}
      <View
        style={[
          styles.heroIcon,
          {
            backgroundColor: colors.accent.soft,
            borderRadius: radius.md,
            marginBottom: space[4],
          },
        ]}
      >
        <SymbolView name={copy.icon} size={28} tintColor={colors.accent.softFg} />
      </View>

      <Text style={[typography.title2, { color: colors.fg.primary, marginBottom: space[2] }]}>
        {copy.title}
      </Text>
      <Text style={[typography.body, { color: colors.fg.secondary, marginBottom: space[5] }]}>
        {copy.sub}
      </Text>

      {/* Auth buttons */}
      <View style={{ gap: space[2], marginBottom: space[3] }}>
        {Platform.OS === 'ios' && onAppleSignIn && (
          <Button variant="primary" size="lg" icon="apple.logo" onPress={onAppleSignIn}>
            Continuer avec Apple
          </Button>
        )}
        {onGoogleSignIn && (
          <Button variant="secondary" size="lg" onPress={onGoogleSignIn}>
            Continuer avec Google
          </Button>
        )}
        {onEmailSignUp && (
          <Button variant="secondary" size="lg" icon="envelope" onPress={onEmailSignUp}>
            Continuer avec un email
          </Button>
        )}
      </View>

      {/* Skip — non-bloquant */}
      <Pressable
        onPress={handleSkip}
        hitSlop={8}
        style={{ alignItems: 'center', paddingVertical: space[3] }}
      >
        <Text style={[typography.body, { color: colors.fg.tertiary }]}>
          Plus tard — garder en local
        </Text>
      </Pressable>

      {/* Reassurance footnote */}
      <Text
        style={[
          typography.caption,
          {
            color: colors.fg.muted,
            textAlign: 'center',
            textTransform: 'none',
            letterSpacing: 0,
            marginTop: space[2],
          },
        ]}
      >
        Tes données restent locales tant que tu n'as pas de compte. Aucune publicité, jamais de revente.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heroIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
