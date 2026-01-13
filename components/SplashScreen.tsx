import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions, Text } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../utils/designSystem';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Text animation
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Hold for a moment
      Animated.delay(500),
    ]).start(() => {
      onAnimationComplete?.();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Background circles decoration */}
      <View style={styles.decorationTop} />
      <View style={styles.decorationBottom} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>ZeroGaspy</Text>
        <Text style={styles.tagline}>Stop au gaspillage alimentaire</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.primary[500],
    opacity: 0.08,
  },
  decorationBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.secondary.sage,
    opacity: 0.15,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: -1,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
});
