import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Animated,
  TouchableOpacity,
  ViewToken,
  Easing,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import {
  DEVICE,
  scaleFontSize,
  scaleSize,
  scaleSpacing,
  isSmallScreen,
} from '../utils/responsive';
import { COLORS } from '../utils/designSystem';
import logger from '../utils/logger';

const { width, height } = Dimensions.get('window');
const RECIPE_ONBOARDING_KEY = 'recipe_onboarding_completed';
const responsiveIllustrationScale = isSmallScreen ? 0.65 : DEVICE.width < 400 ? 0.8 : 1;

// ============================================
// ANIMATED FLOATING ELEMENT (same as OnboardingScreen)
// ============================================

function FloatingElement({
  children,
  delay = 0,
  duration = 3000,
  range = 15,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  range?: number;
  style?: any;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const entranceAnimation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]);
    entranceAnimation.start();

    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnimation.start();

    return () => {
      entranceAnimation.stop();
      loopAnimation.stop();
    };
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -range],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }, { scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ============================================
// CUSTOM SVG ILLUSTRATIONS
// ============================================

// Slide 1: Matching - Plate with percentage badge
const MatchingIllustration = React.memo(function MatchingIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={140 * scale} height={140 * scale} viewBox="0 0 140 140">
      <Defs>
        <LinearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.neutral.white} />
          <Stop offset="100%" stopColor="#F0F0F0" />
        </LinearGradient>
        <LinearGradient id="foodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.primary[400]} />
          <Stop offset="100%" stopColor={COLORS.primary[600]} />
        </LinearGradient>
      </Defs>
      {/* Plate */}
      <Circle cx="70" cy="75" r="52" fill="url(#plateGrad)" stroke={COLORS.neutral.gray300} strokeWidth="2" />
      <Circle cx="70" cy="75" r="40" fill="url(#plateGrad)" stroke={COLORS.neutral.gray200} strokeWidth="1" />
      {/* Food items on plate */}
      <Circle cx="55" cy="68" r="12" fill={COLORS.accent.avocado} />
      <Circle cx="78" cy="65" r="10" fill={COLORS.accent.carrot} />
      <Circle cx="68" cy="82" r="9" fill={COLORS.accent.tomato} />
      <Circle cx="85" cy="80" r="7" fill={COLORS.accent.lemon} />
      {/* Percentage badge */}
      <Circle cx="110" cy="30" r="22" fill={COLORS.primary[500]} />
      <Circle cx="110" cy="30" r="19" fill={COLORS.primary[500]} stroke={COLORS.neutral.white} strokeWidth="2" />
      <Path d="M100 30 L104 26 L108 34 L112 22 L116 30 L120 28" stroke={COLORS.neutral.white} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkle accents */}
      <Path d="M25 40 L28 35 L31 40 L28 45 Z" fill={COLORS.primary[300]} opacity="0.6" />
      <Path d="M115 95 L118 90 L121 95 L118 100 Z" fill={COLORS.primary[300]} opacity="0.6" />
    </Svg>
  );
});

// Slide 2: Anti-waste - Flame with clock
const AntiWasteIllustration = React.memo(function AntiWasteIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={140 * scale} height={150 * scale} viewBox="0 0 140 150">
      <Defs>
        <LinearGradient id="flameGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="50%" stopColor="#EF4444" />
          <Stop offset="100%" stopColor="#F97316" />
        </LinearGradient>
        <LinearGradient id="innerFlameGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <Stop offset="0%" stopColor="#FCD34D" />
          <Stop offset="100%" stopColor="#FBBF24" />
        </LinearGradient>
      </Defs>
      {/* Main flame */}
      <Path
        d="M70 15 C50 45 30 65 30 90 C30 115 48 135 70 135 C92 135 110 115 110 90 C110 65 90 45 70 15"
        fill="url(#flameGrad)"
      />
      {/* Inner flame */}
      <Path
        d="M70 55 C60 70 50 80 50 95 C50 110 58 120 70 120 C82 120 90 110 90 95 C90 80 80 70 70 55"
        fill="url(#innerFlameGrad)"
      />
      {/* Clock badge */}
      <G>
        <Circle cx="108" cy="110" r="20" fill={COLORS.neutral.white} />
        <Circle cx="108" cy="110" r="17" fill={COLORS.neutral.white} stroke={COLORS.semantic.warning} strokeWidth="2.5" />
        {/* Clock hands */}
        <Path d="M108 110 L108 99" stroke={COLORS.text.primary} strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M108 110 L116 114" stroke={COLORS.semantic.warning} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="108" cy="110" r="2" fill={COLORS.text.primary} />
      </G>
      {/* Sparkles */}
      <Circle cx="35" cy="35" r="3" fill="#FBBF24" opacity="0.7" />
      <Circle cx="105" cy="25" r="2.5" fill="#F97316" opacity="0.6" />
      <Circle cx="20" cy="70" r="2" fill="#FCD34D" opacity="0.5" />
    </Svg>
  );
});

// Slide 3: Filters - Category chips
const FiltersIllustration = React.memo(function FiltersIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={150 * scale} height={130 * scale} viewBox="0 0 150 130">
      <Defs>
        <LinearGradient id="chipGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={COLORS.primary[400]} />
          <Stop offset="100%" stopColor={COLORS.primary[500]} />
        </LinearGradient>
      </Defs>
      {/* Row 1 - filter chips */}
      <Rect x="5" y="10" width="60" height="30" rx="15" fill={COLORS.primary[500]} />
      <Circle cx="22" cy="25" r="7" fill="rgba(255,255,255,0.3)" />
      <Path d="M19 25 L22 22 L25 25 L22 28 Z" fill={COLORS.neutral.white} />

      <Rect x="72" y="10" width="70" height="30" rx="15" fill={COLORS.accent.carrot} opacity="0.9" />
      <Circle cx="89" cy="25" r="7" fill="rgba(255,255,255,0.3)" />
      <Rect x="87" y="22" width="4" height="6" rx="1" fill={COLORS.neutral.white} />

      {/* Row 2 */}
      <Rect x="15" y="50" width="55" height="30" rx="15" fill={COLORS.accent.tomato} opacity="0.9" />
      <Circle cx="32" cy="65" r="7" fill="rgba(255,255,255,0.3)" />

      <Rect x="78" y="50" width="65" height="30" rx="15" fill={COLORS.accent.avocado} opacity="0.9" />
      <Circle cx="95" cy="65" r="7" fill="rgba(255,255,255,0.3)" />
      <Path d="M92 62 L98 62 L95 68 Z" fill={COLORS.neutral.white} />

      {/* Row 3 */}
      <Rect x="25" y="90" width="50" height="30" rx="15" fill={COLORS.accent.blueberry} opacity="0.9" />
      <Rect x="82" y="90" width="45" height="30" rx="15" fill={COLORS.accent.lemon} opacity="0.9" />

      {/* Sort arrows */}
      <Path d="M5 95 L10 90 L15 95" stroke={COLORS.primary[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M5 105 L10 110 L15 105" stroke={COLORS.primary[400]} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  );
});

// Slide 4: Personal recipes - Notebook with + button
const PersonalRecipeIllustration = React.memo(function PersonalRecipeIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={130 * scale} height={150 * scale} viewBox="0 0 130 150">
      <Defs>
        <LinearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.neutral.white} />
          <Stop offset="100%" stopColor="#FAFAFA" />
        </LinearGradient>
        <LinearGradient id="coverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.primary[400]} />
          <Stop offset="100%" stopColor={COLORS.primary[600]} />
        </LinearGradient>
      </Defs>
      {/* Book cover */}
      <Rect x="20" y="15" width="90" height="120" rx="8" fill="url(#coverGrad)" />
      {/* Book spine */}
      <Rect x="20" y="15" width="12" height="120" rx="4" fill={COLORS.primary[700]} />
      {/* Book pages */}
      <Rect x="35" y="22" width="70" height="106" rx="4" fill="url(#bookGrad)" />
      {/* Recipe lines */}
      <Path d="M45 42 L95 42" stroke={COLORS.neutral.gray300} strokeWidth="1.5" />
      <Path d="M45 55 L85 55" stroke={COLORS.neutral.gray200} strokeWidth="1.5" />
      <Path d="M45 68 L90 68" stroke={COLORS.neutral.gray200} strokeWidth="1.5" />
      <Path d="M45 81 L80 81" stroke={COLORS.neutral.gray200} strokeWidth="1.5" />
      <Path d="M45 94 L88 94" stroke={COLORS.neutral.gray200} strokeWidth="1.5" />
      {/* Mini food emojis on the cover */}
      <Circle cx="50" cy="35" r="6" fill={COLORS.accent.carrot} opacity="0.8" />
      <Circle cx="65" cy="35" r="6" fill={COLORS.accent.tomato} opacity="0.8" />
      {/* + button */}
      <Circle cx="100" cy="120" r="20" fill={COLORS.primary[500]} />
      <Circle cx="100" cy="120" r="17" fill={COLORS.primary[500]} stroke={COLORS.neutral.white} strokeWidth="2" />
      <Path d="M92 120 L108 120" stroke={COLORS.neutral.white} strokeWidth="3" strokeLinecap="round" />
      <Path d="M100 112 L100 128" stroke={COLORS.neutral.white} strokeWidth="3" strokeLinecap="round" />
      {/* Sparkle */}
      <Path d="M15 50 L18 45 L21 50 L18 55 Z" fill={COLORS.primary[300]} opacity="0.5" />
      <Path d="M115 40 L118 35 L121 40 L118 45 Z" fill={COLORS.primary[300]} opacity="0.5" />
    </Svg>
  );
});

// ============================================
// SLIDE DATA
// ============================================

interface RecipeOnboardingSlide {
  id: string;
  titleKey: string;
  subtitleKey: string;
  illustration: 'matching' | 'antiWaste' | 'filters' | 'personalRecipe';
  accentColor: string;
  bgPattern: string;
}

// ============================================
// SLIDE COMPONENT
// ============================================

function SlideItem({
  item,
  index,
  scrollX,
}: {
  item: RecipeOnboardingSlide;
  index: number;
  scrollX: Animated.Value;
}) {
  const { t } = useTranslation();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [60, 0, -60],
  });

  const illustrationScale = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
  });

  const illustrationRotate = scrollX.interpolate({
    inputRange,
    outputRange: ['15deg', '0deg', '-15deg'],
  });

  const renderIllustration = () => {
    const baseScale = responsiveIllustrationScale;

    switch (item.illustration) {
      case 'matching':
        return (
          <FloatingElement delay={100} duration={2600} range={isSmallScreen ? 8 : 12}>
            <MatchingIllustration scale={1.1 * baseScale} />
          </FloatingElement>
        );
      case 'antiWaste':
        return (
          <FloatingElement delay={100} duration={2400} range={isSmallScreen ? 6 : 10}>
            <AntiWasteIllustration scale={1.0 * baseScale} />
          </FloatingElement>
        );
      case 'filters':
        return (
          <FloatingElement delay={100} duration={2800} range={isSmallScreen ? 8 : 14}>
            <FiltersIllustration scale={1.0 * baseScale} />
          </FloatingElement>
        );
      case 'personalRecipe':
        return (
          <FloatingElement delay={100} duration={2600} range={isSmallScreen ? 6 : 10}>
            <PersonalRecipeIllustration scale={1.0 * baseScale} />
          </FloatingElement>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ width, justifyContent: 'center', flex: 1 }}>
      {/* Background tint */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bgPattern, opacity: 0.4 }]} />

      {/* Content */}
      <View style={styles.slideContent}>
        {/* Illustration */}
        <Animated.View
          style={{
            transform: [
              { scale: illustrationScale },
              { rotate: illustrationRotate },
            ],
            marginBottom: scaleSpacing(isSmallScreen ? 30 : 50),
            height: scaleSize(isSmallScreen ? 140 : 180),
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {renderIllustration()}
        </Animated.View>

        {/* Text content */}
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }],
            alignItems: 'center',
            paddingHorizontal: scaleSpacing(8),
          }}
        >
          <Text style={styles.slideTitle}>
            {t(item.titleKey)}
          </Text>
          <Text style={styles.slideSubtitle}>
            {t(item.subtitleKey)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================
// PAGINATION
// ============================================

function Pagination({
  scrollX,
  slides,
}: {
  scrollX: Animated.Value;
  slides: RecipeOnboardingSlide[];
}) {
  const dotHeight = scaleSize(isSmallScreen ? 8 : 10);
  const dotWidthInactive = scaleSize(isSmallScreen ? 8 : 10);
  const dotWidthActive = scaleSize(isSmallScreen ? 24 : 30);

  return (
    <View style={styles.paginationContainer}>
      {slides.map((slide, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [dotWidthInactive, dotWidthActive, dotWidthInactive],
          extrapolate: 'clamp',
        });

        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={{
              width: dotWidth,
              height: dotHeight,
              borderRadius: dotHeight / 2,
              backgroundColor: slide.accentColor,
              opacity: dotOpacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface RecipeOnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export default function RecipeOnboardingModal({ visible, onComplete }: RecipeOnboardingModalProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const slides: RecipeOnboardingSlide[] = useMemo(() => [
    {
      id: '1',
      titleKey: 'recipes.onboarding.slide1Title',
      subtitleKey: 'recipes.onboarding.slide1Subtitle',
      illustration: 'matching',
      accentColor: COLORS.primary[500],
      bgPattern: COLORS.primary[50],
    },
    {
      id: '2',
      titleKey: 'recipes.onboarding.slide2Title',
      subtitleKey: 'recipes.onboarding.slide2Subtitle',
      illustration: 'antiWaste',
      accentColor: COLORS.semantic.warning,
      bgPattern: COLORS.surface.warningBg,
    },
    {
      id: '3',
      titleKey: 'recipes.onboarding.slide3Title',
      subtitleKey: 'recipes.onboarding.slide3Subtitle',
      illustration: 'filters',
      accentColor: COLORS.primary[500],
      bgPattern: COLORS.primary[50],
    },
    {
      id: '4',
      titleKey: 'recipes.onboarding.slide4Title',
      subtitleKey: 'recipes.onboarding.slide4Subtitle',
      illustration: 'personalRecipe',
      accentColor: COLORS.primary[500],
      bgPattern: COLORS.primary[50],
    },
  ], []);

  const viewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(RECIPE_ONBOARDING_KEY, 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      logger.error('Error saving recipe onboarding state:', error);
      onComplete();
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;
  const currentSlide = slides[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {/* Skip button */}
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            accessibilityLabel={t('recipes.onboarding.skip')}
            accessibilityRole="button"
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>
              {t('recipes.onboarding.skip')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item, index }) => (
            <SlideItem item={item} index={index} scrollX={scrollX} />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={16}
        />

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Pagination */}
          <View style={styles.paginationWrapper}>
            <Pagination scrollX={scrollX} slides={slides} />
          </View>

          {/* Action button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.9}
              accessibilityLabel={isLastSlide ? t('recipes.onboarding.letsGo') : t('recipes.onboarding.continue')}
              accessibilityRole="button"
              style={[styles.actionButton, { backgroundColor: currentSlide.accentColor, shadowColor: currentSlide.accentColor }]}
            >
              <Text style={styles.actionButtonText}>
                {isLastSlide ? t('recipes.onboarding.letsGo') : t('recipes.onboarding.continue')}
              </Text>
              <View style={styles.actionButtonIcon}>
                <Ionicons
                  name={isLastSlide ? 'rocket' : 'arrow-forward'}
                  size={scaleSize(isSmallScreen ? 16 : 18)}
                  color={COLORS.neutral.white}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Progress indicator */}
          <Text style={styles.progressText}>
            {currentIndex + 1} / {slides.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export { RECIPE_ONBOARDING_KEY };

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.background,
  },
  skipButton: {
    position: 'absolute',
    top: scaleSpacing(isSmallScreen ? 45 : 55),
    right: scaleSpacing(16),
    zIndex: 100,
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(12),
  },
  skipText: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(24),
    paddingTop: isSmallScreen ? scaleSpacing(40) : scaleSpacing(20),
  },
  slideTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 28 : 34),
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: scaleFontSize(isSmallScreen ? 34 : 42),
    letterSpacing: -1,
    marginBottom: scaleSpacing(14),
  },
  slideSubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
    maxWidth: scaleSize(280),
    letterSpacing: 0.2,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: scaleSpacing(isSmallScreen ? 30 : 45),
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    backgroundColor: 'transparent',
  },
  paginationWrapper: {
    marginBottom: scaleSpacing(isSmallScreen ? 20 : 28),
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSpacing(10),
  },
  actionButton: {
    borderRadius: scaleSize(16),
    paddingVertical: scaleSpacing(isSmallScreen ? 14 : 18),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  actionButtonText: {
    color: COLORS.neutral.white,
    fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtonIcon: {
    marginLeft: scaleSpacing(10),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: scaleSize(10),
    padding: scaleSpacing(5),
  },
  progressText: {
    textAlign: 'center',
    marginTop: scaleSpacing(14),
    fontSize: scaleFontSize(isSmallScreen ? 11 : 13),
    color: COLORS.text.muted,
    fontWeight: '500',
  },
});
