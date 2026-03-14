import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

interface ReceiptScanUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onUpgradeToPro: () => void;
  isRewardedAdReady: boolean;
  isRewardedAdLoading?: boolean;
  onRetryLoadAd?: () => void;
  needsConsent?: boolean;
  onRequestConsent?: () => void;
}

export default function ReceiptScanUnlockModal({
  visible,
  onClose,
  onWatchAd,
  onUpgradeToPro,
  isRewardedAdReady,
  isRewardedAdLoading = false,
  onRetryLoadAd,
  needsConsent = false,
  onRequestConsent,
}: ReceiptScanUnlockModalProps) {
  // Tenter de recharger la pub quand le modal s'ouvre et qu'elle n'est pas prête
  useEffect(() => {
    if (visible && !isRewardedAdReady && !isRewardedAdLoading && !needsConsent && onRetryLoadAd) {
      onRetryLoadAd();
    }
  }, [visible, isRewardedAdReady, isRewardedAdLoading, needsConsent, onRetryLoadAd]);

  const adNotAvailable = !isRewardedAdReady;

  // Déterminer l'action et le texte du bouton pub
  const getAdButtonConfig = () => {
    if (needsConsent) {
      return {
        onPress: onRequestConsent || onRetryLoadAd,
        icon: 'shield-checkmark' as const,
        iconColor: COLORS.semantic.warningDark || '#D97706',
        bgColor: hexToRgba('#D97706', 0.15),
        title: 'Accepter les publicités',
        description: 'Consentement requis pour afficher une vidéo',
        trailingIcon: 'chevron-forward' as const,
        disabled: false,
      };
    }

    if (isRewardedAdLoading) {
      return {
        onPress: undefined,
        icon: 'play-circle' as const,
        iconColor: COLORS.status.indigo,
        bgColor: hexToRgba(COLORS.status.indigo, 0.15),
        title: 'Regarder une vidéo',
        description: 'Chargement de la publicité...',
        trailingIcon: null,
        disabled: true,
      };
    }

    if (isRewardedAdReady) {
      return {
        onPress: onWatchAd,
        icon: 'play-circle' as const,
        iconColor: COLORS.status.indigo,
        bgColor: hexToRgba(COLORS.status.indigo, 0.15),
        title: 'Regarder une vidéo',
        description: '1 scan gratuit par mois',
        trailingIcon: 'chevron-forward' as const,
        disabled: false,
      };
    }

    return {
      onPress: onRetryLoadAd,
      icon: 'play-circle' as const,
      iconColor: COLORS.neutral.grayDisabled,
      bgColor: hexToRgba(COLORS.status.indigo, 0.08),
      title: 'Regarder une vidéo',
      description: 'Appuyez pour réessayer',
      trailingIcon: 'reload' as const,
      disabled: false,
    };
  };

  const adButton = getAdButtonConfig();

  return (
    <AnimatedModal visible={visible} onClose={onClose} position="center">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="receipt" size={48} color={COLORS.primary[500]} />
          </View>
          <Text style={styles.title}>Scan de ticket</Text>
          <Text style={styles.subtitle}>
            Fonctionnalité premium
          </Text>
        </View>

        {/* Description */}
        <View style={styles.content}>
          <Text style={styles.description}>
            Le scan automatique de tickets est une fonctionnalité réservée aux utilisateurs <Text style={styles.proBadge}>Pro</Text>.
          </Text>

          <Text style={styles.descriptionSecondary}>
            Vous pouvez débloquer cette fonctionnalité de deux façons :
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {/* Option 1 : Regarder une pub / Accepter consentement */}
          <PressableScale
            onPress={adButton.onPress}
            style={[
              styles.optionCard,
              adNotAvailable && !needsConsent && styles.optionCardDisabled,
              needsConsent && styles.optionCardConsent,
            ]}
            hapticType="medium"
            activeScale={0.97}
            disabled={adButton.disabled}
          >
            <View style={[styles.optionIcon, { backgroundColor: adButton.bgColor }]}>
              {isRewardedAdLoading && !needsConsent ? (
                <ActivityIndicator size="small" color={COLORS.status.indigo} />
              ) : (
                <Ionicons name={adButton.icon} size={32} color={adButton.iconColor} />
              )}
            </View>
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionTitle,
                adNotAvailable && !needsConsent && styles.optionTitleDisabled,
                needsConsent && styles.optionTitleConsent,
              ]}>
                {adButton.title}
              </Text>
              <Text style={styles.optionDescription}>
                {adButton.description}
              </Text>
            </View>
            {isRewardedAdLoading && !needsConsent ? (
              <ActivityIndicator size="small" color={COLORS.text.tertiary} />
            ) : adButton.trailingIcon ? (
              <Ionicons
                name={adButton.trailingIcon}
                size={20}
                color={needsConsent ? '#D97706' : adNotAvailable ? COLORS.neutral.grayDisabled : COLORS.text.tertiary}
              />
            ) : null}
          </PressableScale>

          {/* Option 2 : Upgrade Pro */}
          <PressableScale
            onPress={() => {
              onClose();
              onUpgradeToPro();
            }}
            style={[styles.optionCard, styles.optionCardPremium]}
            hapticType="medium"
            activeScale={0.97}
          >
            <View style={[styles.optionIcon, { backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3) }]}>
              <Ionicons name="star" size={32} color={COLORS.primary[500]} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: COLORS.primary[500] }]}>
                Passer à Pro
              </Text>
              <Text style={styles.optionDescription}>
                Scans illimités + toutes les fonctionnalités
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary[500]} />
          </PressableScale>
        </View>

        {/* Close button */}
        <PressableScale
          onPress={onClose}
          style={styles.closeButton}
          hapticType="light"
        >
          <Text style={styles.closeButtonText}>Annuler</Text>
        </PressableScale>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    padding: SPACING['3xl'],
    maxWidth: 400,
    ...SHADOWS.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  content: {
    marginBottom: SPACING['2xl'],
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  proBadge: {
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  descriptionSecondary: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  options: {
    gap: SPACING.md,
    marginBottom: SPACING['2xl'],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
  },
  optionCardDisabled: {
    opacity: 0.7,
    borderStyle: 'dashed',
  },
  optionCardConsent: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: hexToRgba('#D97706', 0.05),
  },
  optionCardPremium: {
    borderColor: COLORS.primary[500],
    borderWidth: 2,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.2),
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  optionTitleDisabled: {
    color: COLORS.text.secondary,
  },
  optionTitleConsent: {
    color: '#D97706',
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
});
