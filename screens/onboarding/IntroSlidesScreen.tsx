import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { COLORS, RADIUS, SHADOWS, SPACING, hexToRgba } from '../../utils/designSystem';
import {
  isSmallScreen,
  scaleFontSize,
  scaleSize,
  scaleSpacing,
} from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IntroSlidesScreenProps {
  onSlidesComplete: () => void;
}

interface SlideData {
  key: string;
  emoji: string;
  titleKey: string;
  subKey: string;
  pill1Key: string;
  pill2Key: string;
}

const SLIDES: SlideData[] = [
  {
    key: 'slide1',
    emoji: '🥗',
    titleKey: 'onboarding.slide1Title',
    subKey: 'onboarding.slide1Sub',
    pill1Key: 'onboarding.slide1Pill1',
    pill2Key: 'onboarding.slide1Pill2',
  },
  {
    key: 'slide2',
    emoji: '⏰',
    titleKey: 'onboarding.slide2Title',
    subKey: 'onboarding.slide2Sub',
    pill1Key: 'onboarding.slide2Pill1',
    pill2Key: 'onboarding.slide2Pill2',
  },
  {
    key: 'slide3',
    emoji: '🤖',
    titleKey: 'onboarding.slide3Title',
    subKey: 'onboarding.slide3Sub',
    pill1Key: 'onboarding.slide3Pill1',
    pill2Key: 'onboarding.slide3Pill2',
  },
];

export default function IntroSlidesScreen({ onSlidesComplete }: IntroSlidesScreenProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideData>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = currentIndex + 1;
    if (nextIndex < SLIDES.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleCTA = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSlidesComplete();
  };

  const renderSlide = ({ item }: { item: SlideData }) => (
    <View style={styles.slideWrapper}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{t(item.titleKey)}</Text>
        <Text style={styles.subtitle}>{t(item.subKey)}</Text>
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t(item.pill1Key)}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t(item.pill2Key)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getItemLayout = (_: ArrayLike<SlideData> | null | undefined, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button — hidden on last slide */}
      {!isLastSlide && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSlidesComplete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      />

      {/* Bottom area: dots + action buttons */}
      <View style={styles.bottomArea}>
        {/* Dot/pill progress indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [7, 20, 7],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity },
                ]}
              />
            );
          })}
        </View>

        {/* Action buttons */}
        {isLastSlide ? (
          <TouchableOpacity style={styles.ctaButton} onPress={handleCTA} activeOpacity={0.85}>
            <Text style={styles.ctaText}>{t('onboarding.letsGo')} 🚀</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextText}>{t('onboarding.next')} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.background,
  },
  skipButton: {
    position: 'absolute',
    top: isSmallScreen ? scaleSpacing(48) : scaleSpacing(56),
    right: scaleSpacing(20),
    zIndex: 10,
    paddingHorizontal: scaleSpacing(12),
    paddingVertical: scaleSpacing(6),
  },
  skipText: {
    fontSize: scaleFontSize(15),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingTop: isSmallScreen ? scaleSpacing(72) : scaleSpacing(96),
    paddingBottom: scaleSpacing(SPACING.xl),
  },
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    paddingHorizontal: scaleSpacing(SPACING['2xl']),
    paddingVertical: scaleSpacing(SPACING['3xl']),
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  emoji: {
    fontSize: scaleSize(56),
    marginBottom: scaleSpacing(SPACING.lg),
    textAlign: 'center',
  },
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 22 : 26),
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: scaleSpacing(SPACING.md),
    lineHeight: scaleFontSize(isSmallScreen ? 28 : 34),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scaleFontSize(15),
    fontWeight: '400',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFontSize(22),
    marginBottom: scaleSpacing(SPACING['2xl']),
  },
  pillsRow: {
    flexDirection: 'row',
    gap: scaleSpacing(SPACING.sm),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.full,
    paddingHorizontal: scaleSpacing(14),
    paddingVertical: scaleSpacing(6),
  },
  pillText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: COLORS.primary[500],
    letterSpacing: 0.2,
  },
  bottomArea: {
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingBottom: isSmallScreen ? scaleSpacing(28) : scaleSpacing(40),
    paddingTop: scaleSpacing(SPACING.lg),
    alignItems: 'center',
    gap: scaleSpacing(SPACING.lg),
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
  },
  dot: {
    height: scaleSize(7),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
  },
  ctaButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    width: '100%',
    paddingVertical: scaleSpacing(16),
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  ctaText: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    color: COLORS.neutral.white,
    letterSpacing: 0.2,
  },
  nextButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingVertical: scaleSpacing(12),
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  nextText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});
