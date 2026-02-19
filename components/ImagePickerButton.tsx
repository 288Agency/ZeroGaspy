import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, RADIUS, hexToRgba } from '../utils/designSystem';
import { FoodIllustration } from './icons';

interface ImagePickerButtonProps {
  onPress: () => void;
  imageUri?: string | null;
}

export default function ImagePickerButton({
  onPress,
  imageUri,
}: ImagePickerButtonProps) {
  const { t } = useTranslation();
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
        accessibilityLabel={hasImage ? t('common.edit') : t('common.add')}
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
            <Text style={styles.emptyText}>{t('addFood.takePhoto')}</Text>

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
