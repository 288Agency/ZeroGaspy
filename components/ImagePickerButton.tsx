import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, RADIUS, hexToRgba } from '../utils/designSystem';

interface ImagePickerButtonProps {
  onPress: () => void;
  imageUri?: string | null;
}

// Decorative food illustration for empty state
function FoodIllustration() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.secondary.sage} />
          <Stop offset="100%" stopColor={COLORS.primary[200]} />
        </LinearGradient>
      </Defs>
      {/* Plate */}
      <Circle cx="30" cy="35" rx="25" ry="12" fill="url(#plateGrad)" />
      <Circle cx="30" cy="35" rx="20" ry="9" fill={COLORS.neutral.white} opacity="0.5" />
      {/* Food items */}
      <Circle cx="22" cy="30" r="6" fill={COLORS.accent.tomato} />
      <Circle cx="35" cy="28" r="5" fill={COLORS.accent.avocado} />
      <Circle cx="30" cy="35" r="4" fill={COLORS.accent.carrot} />
      {/* Shine */}
      <Circle cx="18" cy="28" r="2" fill="white" opacity="0.6" />
    </Svg>
  );
}

export default function ImagePickerButton({
  onPress,
  imageUri,
}: ImagePickerButtonProps) {
  const hasImage = !!imageUri;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <PressableScale
        onPress={onPress}
        style={styles.container}
        hapticType="light"
        activeScale={0.96}
        accessibilityLabel={hasImage ? "Modifier l'image" : "Ajouter une image"}
        accessibilityRole="button"
      >
        {hasImage ? (
          <>
            <Image
              source={{ uri: imageUri! }}
              style={styles.image}
              resizeMode="cover"
            />
            {/* Edit overlay */}
            <View style={styles.overlay}>
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={20} color={COLORS.neutral.white} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            {/* Illustration */}
            <FoodIllustration />

            {/* Text */}
            <Text style={styles.emptyText}>Ajouter une photo</Text>

            {/* Add badge */}
            <View style={styles.addBadge}>
              <Ionicons name="add" size={18} color={COLORS.neutral.white} />
            </View>
          </View>
        )}

        {/* Decorative border dots */}
        {!hasImage && (
          <>
            <View style={[styles.borderDot, { top: 10, left: 10 }]} />
            <View style={[styles.borderDot, { top: 10, right: 10 }]} />
            <View style={[styles.borderDot, { bottom: 10, left: 10 }]} />
            <View style={[styles.borderDot, { bottom: 10, right: 10 }]} />
          </>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
  },
  container: {
    width: 160,
    height: 160,
    borderRadius: RADIUS['2xl'],
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
    borderStyle: 'dashed',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS['2xl'] - 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(COLORS.neutral.black, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.colored(COLORS.primary[500], 0.4),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary[500],
    marginTop: 8,
  },
  addBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  borderDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.3),
  },
});
