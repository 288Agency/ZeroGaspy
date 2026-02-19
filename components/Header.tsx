import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showIcon?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  transparent?: boolean;
  subtitle?: string;
}

export default function Header({
  title,
  showBackButton = true,
  showIcon = false,
  rightIcon = 'ellipsis-vertical',
  onRightPress,
  transparent = false,
  subtitle,
}: HeaderProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const displayTitle = title ?? t('header.defaultTitle');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, transparent && styles.transparent]}>
      {/* Back button */}
      {showBackButton ? (
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hapticType="light"
          accessibilityLabel={t('header.back')}
          accessibilityRole="button"
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="chevron-back" size={scaleSize(isSmallScreen ? 18 : 22)} color={COLORS.primary[500]} />
          </View>
        </PressableScale>
      ) : (
        <View style={styles.spacer} />
      )}

      {/* Title section */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </Animated.View>

      {/* Right action */}
      {showIcon && onRightPress ? (
        <PressableScale
          onPress={onRightPress}
          style={styles.rightButton}
          hapticType="light"
          accessibilityLabel={t('header.options')}
          accessibilityRole="button"
        >
          <View style={styles.rightButtonInner}>
            <Ionicons name={rightIcon} size={scaleSize(isSmallScreen ? 16 : 20)} color={COLORS.primary[500]} />
          </View>
        </PressableScale>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const buttonSize = scaleSize(isSmallScreen ? 36 : 44);
const buttonInnerSize = scaleSize(isSmallScreen ? 32 : 40);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSpacing(isSmallScreen ? 12 : 16),
    paddingTop: scaleSpacing(isSmallScreen ? 44 : 56),
    paddingBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    backgroundColor: COLORS.secondary.cream,
    position: 'relative',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  backButton: {
    width: buttonSize,
    height: buttonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonInner: {
    width: buttonInnerSize,
    height: buttonInnerSize,
    borderRadius: scaleSize(isSmallScreen ? 10 : 14),
    backgroundColor: COLORS.secondary.sage + '40',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary[500] + '20',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(6),
  },
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 18 : 22),
    lineHeight: scaleFontSize(isSmallScreen ? 24 : 28),
    fontWeight: '600',
    color: COLORS.primary[500],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 10 : 12),
    lineHeight: scaleFontSize(isSmallScreen ? 14 : 16),
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: scaleSpacing(2),
  },
  rightButton: {
    width: buttonSize,
    height: buttonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButtonInner: {
    width: buttonInnerSize,
    height: buttonInnerSize,
    borderRadius: scaleSize(isSmallScreen ? 10 : 14),
    backgroundColor: COLORS.secondary.sage + '40',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary[500] + '20',
  },
  spacer: {
    width: buttonSize,
  },
});
