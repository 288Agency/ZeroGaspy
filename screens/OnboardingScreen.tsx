import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Dimensions,
  FlatList,
  Animated,
  TouchableOpacity,
  ViewToken,
  Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Ellipse, G, Rect, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  DEVICE,
  scaleFontSize,
  scaleSize,
  scaleSpacing,
  RESPONSIVE,
  responsive,
  isSmallScreen,
} from '../utils/responsive';

const { width, height } = Dimensions.get('window');

// Responsive scaling factor for illustrations
const responsiveIllustrationScale = isSmallScreen ? 0.65 : DEVICE.width < 400 ? 0.8 : 1;
const ONBOARDING_KEY = 'onboarding_completed';

// ============================================
// CUSTOM SVG ILLUSTRATIONS
// ============================================

// Stylized Carrot Illustration
function CarrotIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={120 * scale} height={140 * scale} viewBox="0 0 120 140">
      <Defs>
        <LinearGradient id="carrotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF8C42" />
          <Stop offset="100%" stopColor="#E85D04" />
        </LinearGradient>
        <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#3C6E47" />
          <Stop offset="100%" stopColor="#6BBF59" />
        </LinearGradient>
      </Defs>
      {/* Carrot body */}
      <Path
        d="M60 35 C75 35 85 50 85 70 C85 100 70 130 60 135 C50 130 35 100 35 70 C35 50 45 35 60 35"
        fill="url(#carrotGrad)"
      />
      {/* Carrot lines */}
      <Path d="M45 60 Q60 65 75 60" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M42 80 Q60 85 78 80" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M48 100 Q60 105 72 100" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Leaves */}
      <Path d="M60 35 C55 25 45 10 50 5 C55 0 65 15 60 35" fill="url(#leafGrad)" />
      <Path d="M60 35 C50 30 35 25 35 15 C35 10 55 20 60 35" fill="url(#leafGrad)" />
      <Path d="M60 35 C70 30 85 25 85 15 C85 10 65 20 60 35" fill="url(#leafGrad)" />
    </Svg>
  );
}

// Stylized Apple Illustration
function AppleIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={110 * scale} height={130 * scale} viewBox="0 0 110 130">
      <Defs>
        <RadialGradient id="appleGrad" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FF6B6B" />
          <Stop offset="100%" stopColor="#C0392B" />
        </RadialGradient>
        <LinearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8B5A2B" />
          <Stop offset="100%" stopColor="#5D4E37" />
        </LinearGradient>
      </Defs>
      {/* Apple body */}
      <Path
        d="M55 25 C30 25 10 50 10 80 C10 110 30 125 55 125 C80 125 100 110 100 80 C100 50 80 25 55 25"
        fill="url(#appleGrad)"
      />
      {/* Apple indent */}
      <Path
        d="M45 25 Q55 35 65 25"
        fill="#C0392B"
      />
      {/* Stem */}
      <Rect x="52" y="8" width="6" height="20" rx="3" fill="url(#stemGrad)" />
      {/* Leaf */}
      <Path
        d="M58 15 Q75 5 80 15 Q75 25 58 20"
        fill="#3C6E47"
      />
      {/* Highlight */}
      <Ellipse cx="35" cy="55" rx="12" ry="18" fill="white" opacity="0.2" />
    </Svg>
  );
}

// Stylized Broccoli Illustration
function BroccoliIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={120 * scale} height={140 * scale} viewBox="0 0 120 140">
      <Defs>
        <RadialGradient id="brocGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#6BBF59" />
          <Stop offset="100%" stopColor="#3C6E47" />
        </RadialGradient>
        <LinearGradient id="brocStem" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5DAE50" />
          <Stop offset="100%" stopColor="#3C6E47" />
        </LinearGradient>
      </Defs>
      {/* Stem */}
      <Path
        d="M50 70 L45 130 Q60 135 75 130 L70 70"
        fill="url(#brocStem)"
      />
      {/* Florets */}
      <Circle cx="60" cy="45" r="30" fill="url(#brocGrad)" />
      <Circle cx="35" cy="55" r="22" fill="url(#brocGrad)" />
      <Circle cx="85" cy="55" r="22" fill="url(#brocGrad)" />
      <Circle cx="45" cy="35" r="18" fill="url(#brocGrad)" />
      <Circle cx="75" cy="35" r="18" fill="url(#brocGrad)" />
      <Circle cx="60" cy="25" r="15" fill="#6BBF59" />
      {/* Texture dots */}
      <Circle cx="50" cy="40" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="70" cy="45" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="60" cy="55" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="40" cy="60" r="2" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="80" cy="58" r="2" fill="#4A9E3D" opacity="0.6" />
    </Svg>
  );
}

// Stylized Bell/Notification Illustration
function NotificationIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={120 * scale} height={140 * scale} viewBox="0 0 120 140">
      <Defs>
        <LinearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD93D" />
          <Stop offset="100%" stopColor="#F4A261" />
        </LinearGradient>
      </Defs>
      {/* Bell body */}
      <Path
        d="M60 20 C40 20 25 40 25 65 L25 85 L15 95 L15 100 L105 100 L105 95 L95 85 L95 65 C95 40 80 20 60 20"
        fill="url(#bellGrad)"
      />
      {/* Bell clapper */}
      <Circle cx="60" cy="115" r="12" fill="#E76F51" />
      {/* Top knob */}
      <Circle cx="60" cy="15" r="8" fill="#F4A261" />
      {/* Highlight */}
      <Path
        d="M40 45 Q45 35 55 35"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      {/* Sound waves */}
      <Path d="M100 50 Q115 60 100 70" stroke="#FFD93D" strokeWidth="3" fill="none" opacity="0.6" />
      <Path d="M108 45 Q128 60 108 75" stroke="#FFD93D" strokeWidth="3" fill="none" opacity="0.4" />
      <Path d="M20 50 Q5 60 20 70" stroke="#FFD93D" strokeWidth="3" fill="none" opacity="0.6" />
      <Path d="M12 45 Q-8 60 12 75" stroke="#FFD93D" strokeWidth="3" fill="none" opacity="0.4" />
    </Svg>
  );
}

// Decorative Leaf Pattern
function LeafPattern({ color = '#3C6E47', opacity = 0.1 }: { color?: string; opacity?: number }) {
  return (
    <Svg width={width} height={300} viewBox={`0 0 ${width} 300`} style={{ position: 'absolute', top: 0 }}>
      <G opacity={opacity}>
        <Path d="M-20 100 Q30 50 80 100 Q30 150 -20 100" fill={color} transform="rotate(-30 30 100)" />
        <Path d="M100 50 Q150 0 200 50 Q150 100 100 50" fill={color} transform="rotate(15 150 50)" />
        <Path d="M250 120 Q300 70 350 120 Q300 170 250 120" fill={color} transform="rotate(-20 300 120)" />
        <Circle cx="50" cy="200" r="8" fill={color} />
        <Circle cx="150" cy="180" r="5" fill={color} />
        <Circle cx="280" cy="220" r="6" fill={color} />
        <Circle cx="350" cy="160" r="4" fill={color} />
      </G>
    </Svg>
  );
}

// Animated floating element wrapper
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
    Animated.sequence([
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
    ]).start();

    Animated.loop(
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
    ).start();
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
// SLIDE DATA
// ============================================

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  illustration: 'welcome' | 'track' | 'organize' | 'notify';
  accentColor: string;
  bgPattern: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Bienvenue sur\nZeroGaspy',
    subtitle: 'Votre allié pour réduire le gaspillage alimentaire et économiser au quotidien',
    illustration: 'welcome',
    accentColor: '#3C6E47',
    bgPattern: '#E8F5E9',
  },
  {
    id: '2',
    title: 'Suivez vos\naliments',
    subtitle: 'Ajoutez vos produits en un clic et gardez un œil sur leurs dates de péremption',
    illustration: 'track',
    accentColor: '#E85D04',
    bgPattern: '#FFF3E0',
  },
  {
    id: '3',
    title: 'Organisez vos\nespaces',
    subtitle: 'Frigo, congélateur, placard... Créez vos espaces et retrouvez tout facilement',
    illustration: 'organize',
    accentColor: '#3C6E47',
    bgPattern: '#E8F5E9',
  },
  {
    id: '4',
    title: 'Soyez alerté\nà temps',
    subtitle: 'Recevez des rappels intelligents avant que vos aliments ne périment',
    illustration: 'notify',
    accentColor: '#F4A261',
    bgPattern: '#FFF8E1',
  },
];

// ============================================
// SLIDE COMPONENT
// ============================================

function OnboardingSlideItem({
  item,
  index,
  scrollX,
}: {
  item: OnboardingSlide;
  index: number;
  scrollX: Animated.Value;
}) {
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
    const cardPadding = scaleSpacing(isSmallScreen ? 12 : 18);
    const iconSize = scaleSize(isSmallScreen ? 32 : 40);
    const cardRadius = scaleSize(isSmallScreen ? 16 : 22);
    const cardGap = scaleSpacing(isSmallScreen ? 10 : 16);

    switch (item.illustration) {
      case 'welcome':
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <FloatingElement delay={0} duration={2500} range={isSmallScreen ? 8 : 12}>
              <View style={{ position: 'absolute', top: scaleSize(-50), left: scaleSize(-65) }}>
                <AppleIllustration scale={0.7 * baseScale} />
              </View>
            </FloatingElement>
            <FloatingElement delay={200} duration={3000} range={isSmallScreen ? 10 : 15}>
              <BroccoliIllustration scale={1.0 * baseScale} />
            </FloatingElement>
            <FloatingElement delay={400} duration={2800} range={isSmallScreen ? 6 : 10}>
              <View style={{ position: 'absolute', top: scaleSize(-35), right: scaleSize(-75) }}>
                <CarrotIllustration scale={0.6 * baseScale} />
              </View>
            </FloatingElement>
          </View>
        );
      case 'track':
        return (
          <View style={{ alignItems: 'center' }}>
            <FloatingElement delay={100} duration={2600} range={isSmallScreen ? 8 : 12}>
              <CarrotIllustration scale={1.1 * baseScale} />
            </FloatingElement>
            {/* Calendar badge */}
            <FloatingElement delay={400} duration={3200} range={isSmallScreen ? 5 : 8}>
              <View style={{
                position: 'absolute',
                bottom: scaleSize(-15),
                right: scaleSize(-50),
                backgroundColor: '#fff',
                borderRadius: scaleSize(16),
                padding: scaleSpacing(12),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}>
                <Ionicons name="calendar" size={scaleSize(28)} color="#E85D04" />
              </View>
            </FloatingElement>
          </View>
        );
      case 'organize':
        return (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: cardGap }}>
            <FloatingElement delay={0} duration={2800} range={isSmallScreen ? 8 : 14}>
              <View style={{
                backgroundColor: '#fff',
                borderRadius: cardRadius,
                padding: cardPadding,
                shadowColor: '#3C6E47',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 25,
                elevation: 12,
                alignItems: 'center',
              }}>
                <Ionicons name="snow-outline" size={iconSize} color="#64B5F6" />
                <Text style={{
                  fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
                  color: '#666',
                  marginTop: scaleSpacing(6),
                  fontWeight: '600'
                }}>Frigo</Text>
              </View>
            </FloatingElement>
            <FloatingElement delay={200} duration={3000} range={isSmallScreen ? 10 : 16}>
              <View style={{
                backgroundColor: '#fff',
                borderRadius: cardRadius,
                padding: cardPadding,
                marginTop: scaleSize(-20),
                shadowColor: '#3C6E47',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 25,
                elevation: 12,
                alignItems: 'center',
              }}>
                <Ionicons name="cube-outline" size={iconSize} color="#A1887F" />
                <Text style={{
                  fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
                  color: '#666',
                  marginTop: scaleSpacing(6),
                  fontWeight: '600'
                }}>Placard</Text>
              </View>
            </FloatingElement>
            <FloatingElement delay={400} duration={2600} range={isSmallScreen ? 8 : 12}>
              <View style={{
                backgroundColor: '#fff',
                borderRadius: cardRadius,
                padding: cardPadding,
                shadowColor: '#3C6E47',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 25,
                elevation: 12,
                alignItems: 'center',
              }}>
                <Ionicons name="thermometer-outline" size={iconSize} color="#81C784" />
                <Text style={{
                  fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
                  color: '#666',
                  marginTop: scaleSpacing(6),
                  fontWeight: '600'
                }}>Congélo</Text>
              </View>
            </FloatingElement>
          </View>
        );
      case 'notify':
        return (
          <FloatingElement delay={100} duration={2400} range={isSmallScreen ? 6 : 10}>
            <NotificationIllustration scale={1.2 * baseScale} />
          </FloatingElement>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ width, height, justifyContent: 'center' }}>
      {/* Background pattern */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: item.bgPattern,
        opacity: 0.4,
      }} />

      <LeafPattern color={item.accentColor} opacity={0.08} />

      {/* Content */}
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scaleSpacing(24),
        paddingTop: isSmallScreen ? scaleSpacing(40) : scaleSpacing(20),
      }}>
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
          <Text
            style={{
              fontSize: scaleFontSize(isSmallScreen ? 28 : 34),
              fontWeight: '800',
              color: '#2D3436',
              textAlign: 'center',
              lineHeight: scaleFontSize(isSmallScreen ? 34 : 42),
              letterSpacing: -1,
              marginBottom: scaleSpacing(14),
            }}
          >
            {item.title}
          </Text>

          <Text
            style={{
              fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
              color: '#636E72',
              textAlign: 'center',
              lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
              maxWidth: scaleSize(280),
              letterSpacing: 0.2,
            }}
          >
            {item.subtitle}
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
  currentIndex,
}: {
  scrollX: Animated.Value;
  currentIndex: number;
}) {
  const dotHeight = scaleSize(isSmallScreen ? 8 : 10);
  const dotWidthInactive = scaleSize(isSmallScreen ? 8 : 10);
  const dotWidthActive = scaleSize(isSmallScreen ? 24 : 30);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleSpacing(10) }}>
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

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

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

    // Button press animation
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
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      onComplete();
    }
  };

  const isLastSlide = currentIndex === slides.length - 1;
  const currentSlide = slides[currentIndex];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F5E6' }}>
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            top: scaleSpacing(isSmallScreen ? 45 : 55),
            right: scaleSpacing(16),
            zIndex: 100,
            paddingVertical: scaleSpacing(8),
            paddingHorizontal: scaleSpacing(12),
          }}
        >
          <Text
            style={{
              fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
              color: '#636E72',
              fontWeight: '600',
            }}
          >
            Passer
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => (
          <OnboardingSlideItem item={item} index={index} scrollX={scrollX} />
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
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: scaleSpacing(isSmallScreen ? 30 : 45),
          paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
          backgroundColor: 'transparent',
        }}
      >
        {/* Pagination */}
        <View style={{ marginBottom: scaleSpacing(isSmallScreen ? 20 : 28) }}>
          <Pagination scrollX={scrollX} currentIndex={currentIndex} />
        </View>

        {/* Action button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.9}
            style={{
              backgroundColor: currentSlide.accentColor,
              borderRadius: scaleSize(16),
              paddingVertical: scaleSpacing(isSmallScreen ? 14 : 18),
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: currentSlide.accentColor,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              {isLastSlide ? "C'est parti !" : 'Continuer'}
            </Text>
            <View
              style={{
                marginLeft: scaleSpacing(10),
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: scaleSize(10),
                padding: scaleSpacing(5),
              }}
            >
              <Ionicons
                name={isLastSlide ? 'rocket' : 'arrow-forward'}
                size={scaleSize(isSmallScreen ? 16 : 18)}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Progress indicator text */}
        <Text
          style={{
            textAlign: 'center',
            marginTop: scaleSpacing(14),
            fontSize: scaleFontSize(isSmallScreen ? 11 : 13),
            color: '#A0A0A0',
            fontWeight: '500',
          }}
        >
          {currentIndex + 1} sur {slides.length}
        </Text>
      </View>
    </View>
  );
}

export { ONBOARDING_KEY };
