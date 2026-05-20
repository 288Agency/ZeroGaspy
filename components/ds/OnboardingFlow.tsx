// ============================================================================
// ZeroGaspy Design System · OnboardingFlow (révisé)
// ============================================================================
// Onboarding 100% LOCAL — pas de compte demandé. Value-first :
// l'utilisateur ajoute son PREMIER aliment dans l'onboarding lui-même,
// expérience "magique" du scan.
//
// Pattern qui répare le drop-off du RegisterScreen actuel :
//   · L'écran register N'EXISTE PLUS dans l'onboarding
//   · L'utilisateur touche la valeur (scanner un produit) avant tout
//   · Notifications demandées seulement après un scan réussi (le user a
//     compris la valeur des reminders)
//   · Compte demandé plus tard, contextuellement (DeferredAuthSheet)
//
// 5 étapes :
//   0. Welcome — value prop chiffrée
//   1. Comment ça marche — scan + reminder
//   2. Premier scan — l'user scanne RÉELLEMENT un produit
//   3. Notifications — permission demandée, opt-in clair
//   4. Done — entrée dans l'app
//
// Usage :
//   <OnboardingFlow
//     onComplete={() => AsyncStorage.setItem(ONBOARDING_KEY, 'true')}
//     onLaunchScanner={() => navigation.navigate('BarcodeScanner', { fromOnboarding: true })}
//     onRequestNotifications={requestNotificationPermissions}
//   />
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import Button from './Button';

type StepKey = 'welcome' | 'how' | 'firstScan' | 'notifications' | 'done';

interface Step {
  key: StepKey;
  icon: SymbolViewProps['name'];
  title: string;
  body: string;
  primaryLabel: string;
  /** Si présent, affiche un bouton ghost "Passer" sous le primary */
  showSkip?: boolean;
}

const STEPS: Step[] = [
  {
    key: 'welcome',
    icon: 'leaf.fill',
    title: 'Stop au gaspi.',
    body: 'Les Français jettent en moyenne 30 kg de nourriture par an et par personne. ZeroGaspy te fait économiser ≈ 50 €/mois.',
    primaryLabel: 'Commencer',
  },
  {
    key: 'how',
    icon: 'barcode.viewfinder',
    title: 'Scanne, oublie, profite.',
    body: 'Scanne le code-barres ou la date de tes produits. On te prévient juste avant qu\'ils périment.',
    primaryLabel: 'Suivant',
  },
  {
    key: 'firstScan',
    icon: 'wand.and.stars',
    title: 'Ajoute ton premier aliment.',
    body: 'Essaie maintenant — prends n\'importe quel produit du frigo et scanne son code-barres.',
    primaryLabel: 'Scanner',
    showSkip: true,
  },
  {
    key: 'notifications',
    icon: 'bell.fill',
    title: 'Sois prévenu·e à temps.',
    body: 'On t\'envoie une alerte 2 jours avant péremption — c\'est ce qui change tout.',
    primaryLabel: 'Activer les rappels',
    showSkip: true,
  },
  {
    key: 'done',
    icon: 'checkmark.circle.fill',
    title: 'Prêt·e à sauver ton frigo.',
    body: 'Pas de compte requis. Tout reste sur ton téléphone — tant que tu ne le veux pas.',
    primaryLabel: 'Entrer dans l\'app',
  },
];

export interface OnboardingFlowProps {
  onComplete: () => void;
  /** Appelé à l'étape "firstScan" — tu navigues vers le scanner */
  onLaunchScanner?: () => void;
  /** Appelé à l'étape "notifications" — tu demandes la permission iOS */
  onRequestNotifications?: () => Promise<boolean>;
}

export default function OnboardingFlow({
  onComplete,
  onLaunchScanner,
  onRequestNotifications,
}: OnboardingFlowProps) {
  const { colors, typography, space, radius, componentRadius, layout } = useTheme();
  const insets = useSafeAreaInsets();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  // Anim fade entre les étapes
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  const animateTo = (nextIdx: number) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: -20, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStepIdx(nextIdx);
      slide.setValue(20);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) animateTo(stepIdx + 1);
    else onComplete();
  };

  const handlePrimary = async () => {
    if (step.key === 'firstScan') {
      onLaunchScanner?.();
      // L'écran scanner doit, en cas de succès, faire revenir l'utilisateur ici
      // sur l'étape "notifications" (via prop or navigation param)
      return;
    }
    if (step.key === 'notifications') {
      try {
        await onRequestNotifications?.();
      } catch {/* permission refusée — on avance quand même */}
      goNext();
      return;
    }
    goNext();
  };

  const handleSkip = () => goNext();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.canvas,
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[6],
          paddingHorizontal: layout.screenPaddingH,
        },
      ]}
    >
      {/* Progress dots */}
      <View style={[styles.dots, { gap: 6 }]}>
        {STEPS.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              {
                backgroundColor: i === stepIdx ? colors.accent.default : colors.border.default,
                width: i === stepIdx ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>

      {/* Content (animé) */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fade, transform: [{ translateX: slide }] },
        ]}
      >
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor: colors.accent.soft,
              borderRadius: radius.lg,
              marginBottom: space[6],
            },
          ]}
        >
          <SymbolView name={step.icon} size={40} tintColor={colors.accent.softFg} />
        </View>

        <Text
          style={[
            typography.display,
            { color: colors.fg.primary, marginBottom: space[4], textAlign: 'left' },
          ]}
        >
          {step.title}
        </Text>
        <Text style={[typography.body, { color: colors.fg.secondary, fontSize: 17, lineHeight: 26 }]}>
          {step.body}
        </Text>
      </Animated.View>

      {/* Actions */}
      <View style={{ gap: space[2] }}>
        <Button variant="primary" size="lg" onPress={handlePrimary}>
          {step.primaryLabel}
        </Button>
        {step.showSkip && (
          <Pressable
            onPress={handleSkip}
            hitSlop={8}
            style={{ alignItems: 'center', paddingVertical: space[3] }}
          >
            <Text style={[typography.body, { color: colors.fg.tertiary }]}>
              Plus tard
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  heroIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
