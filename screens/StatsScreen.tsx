// ============================================================================
// ZeroGaspy · screens/StatsScreen.tsx (handoff port — "Impact")
// ============================================================================
// Wrapper léger autour de StatsDashboard (composant historique 1374 L
// préservé tel quel — palette déjà alignée handoff via retint legacy).
// Le port concerne uniquement le topbar et le scaffold (suppression du
// Header legacy, adoption tokens DS v2).
// ============================================================================

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest } from '@/tokens';
import { PaywallSheet } from '@/components/ds';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import StatsDashboard from '@/components/StatsDashboard';

export default function StatsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const paywallProps = usePaywallSheetProps();
  const [showPaywall, setShowPaywall] = useState(false);
  const shareHandlerRef = useRef<(() => void) | null>(null);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg.canvas, paddingTop: insets.top },
      ]}
    >
      {/* Topbar v2 — titre + action partage */}
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('stats.eyebrow', { defaultValue: 'Ton impact' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('stats.impactTitle')}
          </Text>
        </View>
        <Pressable
          onPress={() => shareHandlerRef.current?.()}
          accessibilityRole="button"
          accessibilityLabel="Partager mon impact"
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            {
              backgroundColor: colors.bg.surface,
              opacity: pressed ? 0.55 : 1,
            },
          ]}
        >
          <SymbolView name="square.and.arrow.up" size={20} tintColor={Forest[600]} />
        </Pressable>
      </View>

      <StatsDashboard
        onOpenPaywall={() => setShowPaywall(true)}
        shareRef={shareHandlerRef}
      />

      <PaywallSheet
        {...paywallProps}
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="addList"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
});
