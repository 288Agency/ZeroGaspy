// ============================================================================
// ZeroGaspy Design System · TabBar (iOS 26 — Liquid Glass)
// ============================================================================
// Bottom tab bar avec matériau Liquid Glass + SF Symbols hiérarchiques.
//
// iOS 26 features utilisés :
//   · `BlurView` avec `systemChromeMaterial` — le material que la nav/tab bar
//     iOS native utilise depuis iOS 13, qui adopte automatiquement le rendu
//     Liquid Glass sur iOS 26. Pas besoin d'un tint custom.
//   · `SymbolView type="hierarchical"` sur les icônes actives — crée une
//     variation tonale automatique du tint, plus vivant que monochrome plat.
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/contexts/ThemeContext';
// ────────────────────────────────────────────────────────────────────────────
// Mapping route name → icônes (inactive / active)
// ────────────────────────────────────────────────────────────────────────────

type IconPair = { inactive: SymbolViewProps['name']; active: SymbolViewProps['name'] };

// iOS 26+ target — tous les SF Symbols ci-dessous sont natifs, pas de fallback.
const ICON_MAP: Record<string, IconPair> = {
  // ── 5-tab layout (production) ─────────────────────────────────────────────
  HomeTab:    { inactive: 'house',                 active: 'house.fill' },
  ListsTab:   { inactive: 'list.bullet.rectangle', active: 'list.bullet.rectangle.fill' },
  RecipesTab: { inactive: 'fork.knife',            active: 'fork.knife' },
  StatsTab:   { inactive: 'chart.bar',             active: 'chart.bar.fill' },
  AccountTab: { inactive: 'person',                active: 'person.fill' },
  // ── 5-tab layout (handoff référence, non utilisé en prod) ─────────────────
  Frigo:      { inactive: 'refrigerator',          active: 'refrigerator.fill' },
  Listes:     { inactive: 'list.bullet.rectangle', active: 'list.bullet.rectangle.fill' },
  Scanner:    { inactive: 'barcode.viewfinder',    active: 'barcode.viewfinder' },
  Profil:     { inactive: 'person',                active: 'person.fill' },
};

function getIcon(routeName: string, focused: boolean): SymbolViewProps['name'] {
  const pair = ICON_MAP[routeName];
  if (!pair) return 'circle';
  return focused ? pair.active : pair.inactive;
}

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
                    <SymbolView
                      name={getIcon('Scanner', isFocused)}
                      type="hierarchical"
                      size={26}
                      tintColor={colors.fg.onAccent}
                    />
                  </View>
                )}
              </Pressable>
            );
          }

          // ── Tab standard — SF Symbol hiérarchique si actif ──
          const color = isFocused ? colors.accent.default : colors.fg.muted;

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
              <SymbolView
                name={getIcon(route.name, isFocused)}
                type={isFocused ? 'hierarchical' : 'monochrome'}
                size={24}
                tintColor={color}
              />
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
