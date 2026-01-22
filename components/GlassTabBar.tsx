import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../utils/designSystem';

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
}

function TabIcon({ name, focused, color }: TabIconProps) {
  const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
    HomeTab: { active: 'home', inactive: 'home-outline' },
    RecipesTab: { active: 'restaurant', inactive: 'restaurant-outline' },
    StatsTab: { active: 'stats-chart', inactive: 'stats-chart-outline' },
    AccountTab: { active: 'person', inactive: 'person-outline' },
  };

  const icons = iconMap[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = focused ? icons.active : icons.inactive;

  return <Ionicons name={iconName} size={22} color={color} />;
}

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Outer glow effect */}
      <View style={styles.glowOuter} />

      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 100}
        tint={Platform.OS === 'ios' ? 'systemThinMaterialLight' : 'light'}
        style={styles.blurContainer}
      >
        {/* Inner gradient overlay for glass effect */}
        <View style={styles.glassOverlay} />

        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel ?? options.title ?? route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const labelText = typeof label === 'string' ? label : route.name.replace('Tab', '');

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerFocused,
                ]}>
                  <TabIcon
                    name={route.name}
                    focused={isFocused}
                    color={isFocused ? COLORS.primary[600] : 'rgba(60, 60, 67, 0.6)'}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    isFocused ? styles.labelFocused : styles.labelInactive,
                  ]}
                  numberOfLines={1}
                >
                  {labelText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  glowOuter: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(60, 110, 71, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
    }),
  },
  blurContainer: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 0.5 : 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(255, 255, 255, 0.25)'
      : 'rgba(255, 255, 255, 0.92)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 2,
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(60, 110, 71, 0.15)',
  },
  label: {
    fontSize: 10,
    letterSpacing: -0.2,
  },
  labelFocused: {
    fontWeight: '600',
    color: COLORS.primary[600],
  },
  labelInactive: {
    fontWeight: '500',
    color: 'rgba(60, 60, 67, 0.6)',
  },
});
