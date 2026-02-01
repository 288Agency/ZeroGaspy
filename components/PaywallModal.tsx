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
const FloatingCircle = ({ delay = 0, size = 20, color = '#A3C9A8', style }: any) => {
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
      colors={['#A3C9A8', '#7DB485']}
      style={styles.featureIconGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name={name as any} size={22} color="#3C6E47" />
    </LinearGradient>
  </Animated.View>
);

export default function PaywallModal({ visible, onClose, feature = 'general' }: PaywallModalProps) {
  const { packages, purchasePackage, restorePurchases, isLoading } = useSubscription();
  const { user } = useAuth();
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
        return 'Débloquez des listes illimitées pour mieux organiser votre cuisine';
      case 'scanner':
        return 'Scannez vos tickets et ajoutez vos achats en un instant';
      case 'recipes':
        return 'Accédez à des recettes personnalisées selon vos ingrédients disponibles';
      default:
        return 'Passez au niveau supérieur dans votre lutte contre le gaspillage';
    }
  };

  const handlePurchase = async () => {
    const pkg = selectedPackage === 'monthly' ? monthlyPackage : yearlyPackage;
    if (pkg) {
      const success = await purchasePackage(pkg);
      if (success) {
        onClose();
      }
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      onClose();
    }
  };

  const features = [
    { icon: 'infinite-outline', title: 'Listes illimitées', desc: 'Organisez sans limite' },
    { icon: 'scan-outline', title: 'Scanner de tickets', desc: 'Import automatique' },
    { icon: 'sparkles-outline', title: 'Sans publicité', desc: 'Expérience pure' },
    { icon: 'trending-up-outline', title: 'Stats avancées', desc: 'Suivez vos progrès' },
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
          <FloatingCircle delay={0} size={80} style={{ top: 60, left: -20 }} color="#A3C9A8" />
          <FloatingCircle delay={500} size={50} style={{ top: 120, right: 20 }} color="#D4E7D6" />
          <FloatingCircle delay={1000} size={35} style={{ top: 200, left: 50 }} color="#E8F3E9" />
          <AnimatedLeaf delay={0} size={50} style={{ position: 'absolute', top: 80, right: -10, opacity: 0.6 }} />
          <AnimatedLeaf delay={300} size={35} style={{ position: 'absolute', top: 150, left: 10, opacity: 0.4 }} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={22} color="#3C6E47" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore} disabled={isLoading} style={styles.restoreButton}>
            <Text style={styles.restoreText}>Restaurer</Text>
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
                  <Ionicons name="sparkles" size={16} color="#F7F5E6" />
                </View>
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(200).springify()}
              style={styles.heroTitle}
            >
              ZeroGaspy{'\n'}
              <Text style={styles.heroTitleAccent}>Pro</Text>
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
            <Text style={styles.pricingTitle}>Choisissez votre formule</Text>

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
                  colors={['rgba(60, 110, 71, 0.08)', 'rgba(163, 201, 168, 0.12)']}
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
                      <Text style={styles.pricingLabel}>Annuel</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Populaire</Text>
                      </View>
                    </View>
                    <Text style={styles.pricingSubLabel}>{yearlyPrice}/an</Text>
                  </View>
                </View>
                <View style={styles.pricingCardRight}>
                  <SavingsBadge percentage={yearlySavings} />
                  <Text style={styles.pricingMonthly}>
                    {(yearlyPriceNum / 12).toFixed(2).replace('.', ',')}€
                    <Text style={styles.pricingMonthlyUnit}>/mois</Text>
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
                  colors={['rgba(60, 110, 71, 0.08)', 'rgba(163, 201, 168, 0.12)']}
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
                    <Text style={styles.pricingLabel}>Mensuel</Text>
                    <Text style={styles.pricingSubLabel}>Flexibilité maximale</Text>
                  </View>
                </View>
                <View style={styles.pricingCardRight}>
                  <Text style={styles.pricingMonthly}>
                    {monthlyPrice}
                    <Text style={styles.pricingMonthlyUnit}>/mois</Text>
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
                <Ionicons name="person-add-outline" size={20} color="#E85D04" />
              </View>
              <Text style={styles.warningText}>
                Créez un compte gratuit pour vous abonner et synchroniser vos données
              </Text>
            </Animated.View>
          )}

          {/* Trust badges */}
          <Animated.View
            entering={FadeIn.delay(1000)}
            style={styles.trustSection}
          >
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#6A8A6E" />
              <Text style={styles.trustText}>Annulation facile</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="lock-closed-outline" size={16} color="#6A8A6E" />
              <Text style={styles.trustText}>Paiement sécurisé</Text>
            </View>
          </Animated.View>

          {/* Terms */}
          <Text style={styles.terms}>
            Renouvellement automatique. Annulez à tout moment dans les réglages de votre store.
          </Text>
        </ScrollView>

        {/* CTA Button */}
        <Animated.View style={[styles.ctaContainer, ctaAnimatedStyle]}>
          <PressableScale
            onPress={handlePurchase}
            disabled={isLoading || !user}
            style={styles.ctaButtonWrapper}
            hapticType="medium"
          >
            <LinearGradient
              colors={isLoading || !user ? ['#A3C9A8', '#8FBB96'] : ['#3C6E47', '#2D5235']}
              style={styles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {user ? 'Débloquer Pro' : 'Créer un compte'}
                  </Text>
                  <View style={styles.ctaIconContainer}>
                    <Ionicons name="arrow-forward" size={20} color="#3C6E47" />
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
    backgroundColor: '#F7F5E6',
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
    backgroundColor: 'rgba(60, 110, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  restoreText: {
    color: '#3C6E47',
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
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 4,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#3C6E47',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: '#5A9E64',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6A8A6E',
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#3C6E47',
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
    color: '#3C6E47',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#6A8A6E',
    textAlign: 'center',
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C6E47',
    marginBottom: 16,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#3C6E47',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingCardSelected: {
    borderColor: '#3C6E47',
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
    borderColor: '#A3C9A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: '#3C6E47',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3C6E47',
  },
  pricingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C6E47',
  },
  recommendedBadge: {
    backgroundColor: '#3C6E47',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pricingSubLabel: {
    fontSize: 13,
    color: '#6A8A6E',
    marginTop: 2,
  },
  savingsBadge: {
    width: 70,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  savingsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pricingMonthly: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3C6E47',
  },
  pricingMonthlyUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A8A6E',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 4, 0.2)',
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 93, 4, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#B84A00',
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
    color: '#6A8A6E',
    marginLeft: 6,
  },
  terms: {
    fontSize: 11,
    color: '#9CAF9E',
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16,
    backgroundColor: '#F7F5E6',
    shadowColor: '#3C6E47',
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
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
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  ctaIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7F5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
