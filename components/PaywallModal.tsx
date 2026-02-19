import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import PressableScale from './PressableScale';
import { PREMIUM_FEATURES, FALLBACK_PRICES } from '../constants/subscription';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

// URLs légales requises par Apple
const PRIVACY_POLICY_URL = 'https://www.zerogaspy.fr/privacy/';
const TERMS_OF_USE_URL = 'https://www.zerogaspy.fr/terms/';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: 'lists' | 'scanner' | 'recipes' | 'general';
}

// Composant feuille organique animée
const AnimatedLeaf = ({ delay = 0, size = 40, style }: { delay?: number; size?: number; style?: any }) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    rotation.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="leafGrad" cx="30%" cy="30%">
            <Stop offset="0%" stopColor="#5A9E64" />
            <Stop offset="100%" stopColor="#3C6E47" />
          </RadialGradient>
        </Defs>
        <Path
          d="M50 5 C20 25 10 50 15 75 C20 90 35 95 50 95 C65 95 80 90 85 75 C90 50 80 25 50 5 Z"
          fill="url(#leafGrad)"
        />
        <Path
          d="M50 20 L50 85 M50 40 L35 55 M50 55 L65 70"
          stroke="#F7F5E6"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.4}
        />
      </Svg>
    </Animated.View>
  );
};

// Cercles décoratifs flottants
const FloatingCircle = ({ delay = 0, size = 20, color = COLORS.secondary.sage, style }: any) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          position: 'absolute',
        },
        style,
        animatedStyle,
      ]}
    />
  );
};

// Badge économie avec forme organique
const SavingsBadge = ({ percentage }: { percentage: number }) => (
  <View style={styles.savingsBadge}>
    <Svg width={70} height={28} viewBox="0 0 70 28" style={{ position: 'absolute' }}>
      <Path
        d="M5 14 C5 6 12 2 20 2 L50 2 C58 2 65 6 65 14 C65 22 58 26 50 26 L20 26 C12 26 5 22 5 14 Z"
        fill="#F59E0B"
      />
    </Svg>
    <Text style={styles.savingsText}>-{percentage}%</Text>
  </View>
);

// Icône feature avec style organique
const FeatureIcon = ({ name, delay }: { name: string; delay: number }) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify()}
    style={styles.featureIconContainer}
  >
    <LinearGradient
      colors={[COLORS.secondary.sage, COLORS.primary[300]]}
      style={styles.featureIconGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name={name as any} size={22} color={COLORS.primary[500]} />
    </LinearGradient>
  </Animated.View>
);

export default function PaywallModal({ visible, onClose, feature = 'general' }: PaywallModalProps) {
  const { packages, purchasePackage, restorePurchases, isLoading, reloadOfferings } = useSubscription();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'monthly' | 'yearly'>('yearly');

  // Animations
  const headerScale = useSharedValue(0.9);
  const ctaGlow = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      headerScale.value = withSpring(1, { damping: 12 });
      ctaGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [visible]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(ctaGlow.value, [0, 1], [0.3, 0.6]),
    shadowRadius: interpolate(ctaGlow.value, [0, 1], [10, 25]),
  }));

  const monthlyPackage = packages.find(p =>
    p.identifier.includes('monthly') || p.packageType === 'MONTHLY'
  );
  const yearlyPackage = packages.find(p =>
    p.identifier.includes('yearly') || p.identifier.includes('annual') || p.identifier.includes('years') || p.packageType === 'ANNUAL'
  );

  const monthlyPrice = monthlyPackage?.product.priceString || FALLBACK_PRICES.MONTHLY;
  const yearlyPrice = yearlyPackage?.product.priceString || FALLBACK_PRICES.YEARLY;

  const monthlyPriceNum = monthlyPackage?.product.price || 3.99;
  const yearlyPriceNum = yearlyPackage?.product.price || 39.99;
  const yearlySavings = Math.round(((monthlyPriceNum * 12 - yearlyPriceNum) / (monthlyPriceNum * 12)) * 100);

  const getFeatureMessage = () => {
    switch (feature) {
      case 'lists':
        return t('paywall.features.lists');
      case 'scanner':
        return t('paywall.features.scanner');
      case 'recipes':
        return t('paywall.features.recipes');
      default:
        return t('paywall.features.general');
    }
  };

  const handlePurchase = async () => {
    const pkg = selectedPackage === 'monthly' ? monthlyPackage : yearlyPackage;

    // Si pas de packages chargés, tenter de recharger
    if (!pkg) {
      setIsRetrying(true);
      try {
        await reloadOfferings();
      } finally {
        setIsRetrying(false);
      }
      return;
    }

    const success = await purchasePackage(pkg);
    if (success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      onClose();
    }
  };

  const features = [
    { icon: 'infinite-outline', title: t('paywall.featureCards.unlimitedLists'), desc: t('paywall.featureCards.unlimitedListsDesc') },
    { icon: 'scan-outline', title: t('paywall.featureCards.scanner'), desc: t('paywall.featureCards.scannerDesc') },
    { icon: 'sparkles-outline', title: t('paywall.featureCards.noAds'), desc: t('paywall.featureCards.noAdsDesc') },
    { icon: 'trending-up-outline', title: t('paywall.featureCards.advancedStats'), desc: t('paywall.featureCards.advancedStatsDesc') },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Background décoratif */}
        <View style={styles.backgroundDecoration}>
          <FloatingCircle delay={0} size={80} style={{ top: 60, left: -20 }} color={COLORS.secondary.sage} />
          <FloatingCircle delay={500} size={50} style={{ top: 120, right: 20 }} color={COLORS.secondary.mint} />
          <FloatingCircle delay={1000} size={35} style={{ top: 200, left: 50 }} color={COLORS.primary[50]} />
          <AnimatedLeaf delay={0} size={50} style={{ position: 'absolute', top: 80, right: -10, opacity: 0.6 }} />
          <AnimatedLeaf delay={300} size={35} style={{ position: 'absolute', top: 150, left: 10, opacity: 0.4 }} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={22} color={COLORS.primary[500]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={isLoading} style={styles.restoreButton}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View style={[styles.heroSection, headerAnimatedStyle]}>
            <Animated.View entering={FadeIn.delay(100).duration(600)}>
              <View style={styles.heroLogoContainer}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
                <View style={styles.heroSparkle}>
                  <Ionicons name="sparkles" size={16} color={COLORS.secondary.cream} />
                </View>
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(200).springify()}
              style={styles.heroTitle}
            >
              {t('paywall.title')}{'\n'}
              <Text style={styles.heroTitleAccent}>{t('paywall.titleAccent')}</Text>
            </Animated.Text>

            <Animated.Text
              entering={FadeInUp.delay(300).springify()}
              style={styles.heroSubtitle}
            >
              {getFeatureMessage()}
            </Animated.Text>
          </Animated.View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            {features.map((feat, index) => (
              <Animated.View
                key={feat.title}
                entering={FadeInDown.delay(400 + index * 100).springify()}
                style={styles.featureCard}
              >
                <FeatureIcon name={feat.icon} delay={400 + index * 100} />
                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureDesc}>{feat.desc}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Pricing Section */}
          <Animated.View
            entering={FadeInUp.delay(800).springify()}
            style={styles.pricingSection}
          >
            <Text style={styles.pricingTitle}>{t('paywall.pricing.title')}</Text>

            {/* Yearly Plan - Recommended */}
            <PressableScale
              onPress={() => setSelectedPackage('yearly')}
              style={[
                styles.pricingCard,
                selectedPackage === 'yearly' && styles.pricingCardSelected,
              ]}
              hapticType="light"
            >
              {selectedPackage === 'yearly' && (
                <LinearGradient
                  colors={[hexToRgba(COLORS.primary[500], 0.08), hexToRgba(COLORS.secondary.sage, 0.12)]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}

              <View style={styles.pricingCardHeader}>
                <View style={styles.pricingCardLeft}>
                  <View style={[
                    styles.radioOuter,
                    selectedPackage === 'yearly' && styles.radioOuterSelected
                  ]}>
                    {selectedPackage === 'yearly' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View>
                    <View style={styles.pricingLabelRow}>
                      <Text style={styles.pricingLabel}>{t('paywall.pricing.yearly')}</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>{t('paywall.pricing.popular')}</Text>
                      </View>
                    </View>
                    <Text style={styles.pricingCalculated}>
                      {t('paywall.pricing.equivalent')} {(yearlyPriceNum / 12).toFixed(2).replace('.', ',')}€{t('paywall.pricing.perMonth')}
                    </Text>
                  </View>
                </View>
                <View style={styles.pricingCardRight}>
                  <SavingsBadge percentage={yearlySavings} />
                  <Text style={styles.pricingBilled}>
                    {yearlyPrice}
                    <Text style={styles.pricingBilledUnit}>{t('paywall.pricing.perYear')}</Text>
                  </Text>
                </View>
              </View>
            </PressableScale>

            {/* Monthly Plan */}
            <PressableScale
              onPress={() => setSelectedPackage('monthly')}
              style={[
                styles.pricingCard,
                selectedPackage === 'monthly' && styles.pricingCardSelected,
              ]}
              hapticType="light"
            >
              {selectedPackage === 'monthly' && (
                <LinearGradient
                  colors={[hexToRgba(COLORS.primary[500], 0.08), hexToRgba(COLORS.secondary.sage, 0.12)]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}

              <View style={styles.pricingCardHeader}>
                <View style={styles.pricingCardLeft}>
                  <View style={[
                    styles.radioOuter,
                    selectedPackage === 'monthly' && styles.radioOuterSelected
                  ]}>
                    {selectedPackage === 'monthly' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.pricingLabel}>{t('paywall.pricing.monthly')}</Text>
                    <Text style={styles.pricingCalculated}>{t('paywall.pricing.flexibility')}</Text>
                  </View>
                </View>
                <View style={styles.pricingCardRight}>
                  <Text style={styles.pricingBilled}>
                    {monthlyPrice}
                    <Text style={styles.pricingBilledUnit}>{t('paywall.pricing.perMonth')}</Text>
                  </Text>
                </View>
              </View>
            </PressableScale>
          </Animated.View>

          {/* Account Warning */}
          {!user && (
            <Animated.View
              entering={FadeInUp.delay(900).springify()}
              style={styles.warningCard}
            >
              <View style={styles.warningIcon}>
                <Ionicons name="person-add-outline" size={20} color={COLORS.semantic.warningDark} />
              </View>
              <Text style={styles.warningText}>
                {t('paywall.accountWarning')}
              </Text>
            </Animated.View>
          )}

          {/* Trust badges */}
          <Animated.View
            entering={FadeIn.delay(1000)}
            style={styles.trustSection}
          >
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.text.tertiary} />
              <Text style={styles.trustText}>{t('paywall.trust.easyCancellation')}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.text.tertiary} />
              <Text style={styles.trustText}>{t('paywall.trust.securePayment')}</Text>
            </View>
          </Animated.View>

          {/* Subscription Info - Required by Apple */}
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionInfoTitle}>{t('paywall.subscriptionInfo.title')}</Text>
            <Text style={styles.subscriptionInfoText}>
              • {t('paywall.subscriptionInfo.subscription')} {selectedPackage === 'yearly' ? t('paywall.subscriptionInfo.yearlyLabel') : t('paywall.subscriptionInfo.monthlyLabel')} {t('paywall.subscriptionInfo.toZeroGaspyPro')}{'\n'}
              • {t('paywall.subscriptionInfo.duration')} : {selectedPackage === 'yearly' ? t('paywall.subscriptionInfo.oneYear') : t('paywall.subscriptionInfo.oneMonth')}{'\n'}
              • {t('paywall.subscriptionInfo.price')} : {selectedPackage === 'yearly' ? yearlyPrice + t('paywall.pricing.perYear') : monthlyPrice + t('paywall.pricing.perMonth')}{'\n'}
              • {t('paywall.subscriptionInfo.autoRenewal')}
            </Text>
          </View>

          {/* Legal Links - Required by Apple */}
          <View style={styles.legalLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>{t('paywall.legal.termsOfUse')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>•</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>{t('paywall.legal.privacyPolicy')}</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            {t('paywall.terms')}
          </Text>
        </ScrollView>

        {/* CTA Button */}
        <Animated.View style={[styles.ctaContainer, ctaAnimatedStyle]}>
          {/* Message si packages non chargés */}
          {packages.length === 0 && !isLoading && !isRetrying && (
            <Text style={styles.packagesNotLoadedText}>
              {t('paywall.errors.notLoaded')}
            </Text>
          )}
          <PressableScale
            onPress={handlePurchase}
            disabled={isLoading || isRetrying}
            style={styles.ctaButtonWrapper}
            hapticType="medium"
            accessibilityLabel={packages.length === 0 ? t('paywall.cta.retry') : t('paywall.cta.unlock')}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={isLoading || isRetrying ? [COLORS.secondary.sage, COLORS.primary[300]] : [COLORS.primary[500], COLORS.primary[600]]}
              style={styles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading || isRetrying ? (
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {packages.length === 0 ? t('paywall.cta.retry') : t('paywall.cta.unlock')}
                  </Text>
                  <View style={styles.ctaIconContainer}>
                    <Ionicons
                      name={packages.length === 0 ? "refresh" : "arrow-forward"}
                      size={20}
                      color={COLORS.primary[500]}
                    />
                  </View>
                </>
              )}
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  restoreText: {
    color: COLORS.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
  },
  heroLogoContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLogo: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  heroSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent.gold,
    borderRadius: 12,
    padding: 4,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary[500],
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: COLORS.primary[400],
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 32,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 48 - 24) / 2,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featureIconContainer: {
    marginBottom: 12,
  },
  featureIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: 16,
  },
  pricingCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingCardSelected: {
    borderColor: COLORS.primary[500],
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  pricingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingCardRight: {
    alignItems: 'flex-end',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary.sage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: COLORS.primary[500],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary[500],
  },
  pricingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  recommendedBadge: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  recommendedText: {
    color: COLORS.neutral.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pricingSubLabel: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  pricingCalculated: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontWeight: '400',
  },
  savingsBadge: {
    width: 70,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsText: {
    color: COLORS.neutral.white,
    fontSize: 13,
    fontWeight: '800',
  },
  pricingBilled: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary[500],
  },
  pricingBilledUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.warningBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.semantic.warningDark, 0.2),
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: hexToRgba(COLORS.semantic.warningDark, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.accent.amber,
    lineHeight: 18,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 6,
  },
  subscriptionInfo: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.06),
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  subscriptionInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: 8,
  },
  subscriptionInfoText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    lineHeight: 20,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  legalLink: {
    padding: 4,
  },
  legalLinkText: {
    fontSize: 12,
    color: COLORS.primary[500],
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: COLORS.neutral.grayDisabled,
    marginHorizontal: 8,
  },
  terms: {
    fontSize: 11,
    color: COLORS.neutral.grayDisabled,
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16,
    backgroundColor: COLORS.secondary.cream,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  packagesNotLoadedText: {
    fontSize: 12,
    color: COLORS.semantic.warningDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaButtonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    minHeight: 56, // Minimum 44pt recommandé par Apple + padding
  },
  ctaText: {
    color: COLORS.neutral.white,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  ctaIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
