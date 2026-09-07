// ============================================================================
// ZeroGaspy Design System · TabBar (iOS 26 — Liquid Glass)
// ============================================================================
// Bottom tab bar avec matériau Liquid Glass + icônes Phosphor (Brand Bible §06).
//
// iOS 26 features utilisés :
//   · `BlurView` avec `systemChromeMaterial` — le material que la nav/tab bar
//     iOS native utilise depuis iOS 13, qui adopte automatiquement le rendu
//     Liquid Glass sur iOS 26. Pas besoin d'un tint custom.
//   · Icônes Phosphor via `BrandIcon` (fill si onglet actif).
//   · Highlight subtil 1px sur le top edge — simule la réfraction du verre
//     (Apple le fait nativement sur l'UITabBar mais on doit le reproduire en RN).
//
// 5 tabs, ordre :
//   1. Frigo    (Home)
//   2. Listes
//   3. Scanner  ← centre, FAB élevé (déclenche BarcodeScannerScreen modal)
//   4. Stats
//   5. Profil
//
// Usage : voir bas du fichier.
// ============================================================================
//
//   // 1. Dans App.tsx, brancher TabBar comme custom tabBar :
//   <Tab.Navigator tabBar={(props) => <TabBar {...props} />}>
//     <Tab.Screen name="Frigo"   component={HomeScreen} />
//     <Tab.Screen name="Listes"  component={ListsScreen} />
//     <Tab.Screen
//       name="Scanner"
//       component={EmptyScreen}                  // jamais rendu
//       listeners={({ navigation }) => ({
//         tabPress: (e) => {
//           e.preventDefault();
//           navigation.getParent()?.navigate('BarcodeScanner');
//         },
//       })}
//     />
//     <Tab.Screen name="Stats"   component={StatsScreen} />
//     <Tab.Screen name="Profil"  component={SettingsScreen} />
//   </Tab.Navigator>
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BrandIcon } from '@/components/ds/BrandIcon';
import type { BrandIconName } from '@/tokens/brandIcons';
import { useTheme } from '@/contexts/ThemeContext';

const TOQUE_FILLED = require('../../assets/icons/toque.png');
const TOQUE_OUTLINE = require('../../assets/icons/toque-outline.png');

// ────────────────────────────────────────────────────────────────────────────
// Mapping route name → icônes Phosphor (Brand Bible §06)
// ────────────────────────────────────────────────────────────────────────────

type TabIconConfig =
  | { type: 'brand'; icon: BrandIconName }
  | { type: 'image'; focused: ImageSourcePropType; unfocused: ImageSourcePropType };

const ICON_MAP: Record<string, TabIconConfig> = {
  HomeTab:    { type: 'brand', icon: 'home' },
  ListsTab:   { type: 'brand', icon: 'grid' },
  RecipesTab: { type: 'image', focused: TOQUE_FILLED, unfocused: TOQUE_OUTLINE },
  StatsTab:   { type: 'brand', icon: 'chart' },
  AccountTab: { type: 'brand', icon: 'user' },
  // Legacy / handoff
  Frigo:      { type: 'brand', icon: 'fridge' },
  Listes:     { type: 'brand', icon: 'list' },
  Scanner:    { type: 'brand', icon: 'barcode' },
  Profil:     { type: 'brand', icon: 'user' },
};

// ────────────────────────────────────────────────────────────────────────────
// TabBar (custom React Navigation tabBar)
// ────────────────────────────────────────────────────────────────────────────

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, typography, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.bg.surface,
          borderTopColor: colors.border.subtle,
        },
      ]}
    >
      {/* iOS 26 Liquid Glass background — systemChromeMaterial adopte
          automatiquement le rendu Liquid Glass sur iOS 26. */}
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={100}
          tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Réfraction edge — hairline lumineuse sur le top, simule le verre */}
      <View
        pointerEvents="none"
        style={[
          styles.refractionEdge,
          {
            backgroundColor:
              scheme === 'dark'
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.6)',
          },
        ]}
      />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isScanner = route.name === 'Scanner';

          const label =
            (options.tabBarLabel as string) ??
            options.title ??
            route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            Haptics.selectionAsync().catch(() => {});
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          // ── Scanner = FAB élevé central ave glow Liquid Glass ──
          if (isScanner) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityLabel="Scanner un produit"
                style={styles.scannerSlot}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.scannerBtn,
                      {
                        backgroundColor: pressed ? colors.accent.hover : colors.accent.default,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        // Glow Liquid Glass : shadow accent-tinted en plus de l'elevation
                        shadowColor: colors.accent.default,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: scheme === 'dark' ? 0.45 : 0.30,
                        shadowRadius: 16,
                        elevation: 8,
                      },
                    ]}
                  >
                    <BrandIcon
                      name="barcode"
                      size={26}
                      color={colors.fg.onAccent}
                      weight="bold"
                    />
                  </View>
                )}
              </Pressable>
            );
          }

          // ── Tab standard — Phosphor (fill si actif) ──
          const color = isFocused ? colors.accent.default : colors.fg.muted;
          const iconConfig = ICON_MAP[route.name] ?? { type: 'brand' as const, icon: 'home' as BrandIconName };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label as string}
              style={styles.tab}
            >
              {iconConfig.type === 'image' ? (
                <Image
                  source={isFocused ? iconConfig.focused : iconConfig.unfocused}
                  style={{ width: 24, height: 24, tintColor: color }}
                  resizeMode="contain"
                />
              ) : (
                <BrandIcon
                  name={iconConfig.icon}
                  size={24}
                  color={color}
                  weight={isFocused ? 'fill' : 'regular'}
                />
              )}
              <Text
                style={[
                  styles.label,
                  {
                    color,
                    fontFamily: typography.caption.fontFamily,
                  },
                ]}
                numberOfLines={1}
              >
                {label as string}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

/** Hauteur de la tab bar (hors safe-area). Exporté pour calculs de padding scroll/FAB. */
export const TAB_BAR_HEIGHT = 49;
/** Padding bottom recommandé pour ScrollView/FlatList sous la tab bar. Inclure `+ insets.bottom`. */
export const TAB_BAR_SAFE_PADDING = TAB_BAR_HEIGHT + 71;
const BAR_HEIGHT = TAB_BAR_HEIGHT;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
  refractionEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  scannerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Décale vers le haut pour dépasser de la bar
    marginTop: -20,
  },
});
