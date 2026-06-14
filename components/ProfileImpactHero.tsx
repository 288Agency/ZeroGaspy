// ============================================================================
// ZeroGaspy · components/ProfileImpactHero.tsx
// ============================================================================
// Hero "impact" du handoff Profile (§6.9) à injecter en haut de l'AccountScreen
// legacy SANS toucher au reste (préserve achievements/premium/sync/etc.).
//
// Structure :
//   1. Carte hero  — gradient forêt + glow + eyebrow + montant € économisé
//   2. Carte série — flamme + streak actuel + record
//
// Data : calculateUserStats() au mount. Utilise les raw tokens
// (Forest/Sage/Cream) — pas de dépendance ThemeContext.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { Forest, Sage, Cream } from '@/tokens';
import { calculateUserStats } from '@/services/statsService';
import type { UserStats } from '@/types';
import logger from '@/utils/logger';

export default function ProfileImpactHero() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    calculateUserStats()
      .then(setStats)
      .catch((err) => logger.warn('[ProfileImpactHero] stats failed:', err));
  }, []);

  const savedAmount = stats?.totalSaved ?? 0;
  const savedEuros = Math.floor(savedAmount);
  const savedCents = Math.round((savedAmount - savedEuros) * 100);
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const remaining = Math.max(0, longestStreak - currentStreak);

  return (
    <View style={styles.wrap}>
      {/* Hero impact */}
      <View style={styles.heroCard}>
        <LinearGradient
          colors={[Forest[600], Forest[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        />
        <LinearGradient
          colors={['rgba(168,209,131,0.35)', 'transparent']}
          start={{ x: 0.9, y: 0.1 }}
          end={{ x: 0.3, y: 0.6 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        />

        <View style={{ padding: 20 }}>
          <Text style={styles.eyebrow}>économisé depuis le début</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountEuros}>{savedEuros}</Text>
            <Text style={styles.amountCents}>,{String(savedCents).padStart(2, '0')}</Text>
            <Text style={styles.amountSymbol}>€</Text>
          </View>
          <Text style={styles.heroFootnote}>
            {savedAmount === 0
              ? 'Consomme tes premiers aliments pour démarrer.'
              : 'Continue ta lancée — chaque truc consommé compte.'}
          </Text>
        </View>
      </View>

      {/* Série */}
      <View style={styles.streakCard}>
        <View style={styles.flameIcon}>
          <SymbolView name="flame.fill" size={22} tintColor="#C68A1E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakTitle}>
            {currentStreak === 0
              ? 'Lance ta série'
              : `Série de ${currentStreak} jour${currentStreak > 1 ? 's' : ''}`}
          </Text>
          <Text style={styles.streakSub}>
            {longestStreak > 0 && remaining > 0
              ? `Plus que ${remaining}j pour ton record (${longestStreak}j).`
              : currentStreak > 0 && currentStreak >= longestStreak
                ? 'Nouveau record ! Continue.'
                : 'Consomme un aliment avant péremption pour démarrer.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    gap: 10,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 20,
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Cream[50],
    opacity: 0.7,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  amountEuros: {
    color: Cream[50],
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2.4,
    lineHeight: 56,
  },
  amountCents: {
    color: Cream[50],
    fontSize: 34,
    fontStyle: 'italic',
    opacity: 0.92,
    letterSpacing: -0.8,
    marginLeft: 2,
  },
  amountSymbol: {
    color: Cream[50],
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginLeft: 4,
  },
  heroFootnote: {
    color: Cream[50],
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
    marginTop: 10,
    letterSpacing: -0.1,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cream[50],
    borderColor: 'rgba(30, 42, 31, 0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
    shadowColor: '#1E2A1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  flameIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FAE9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2A1F',
    letterSpacing: -0.2,
  },
  streakSub: {
    fontSize: 12,
    color: '#6B7568',
    marginTop: 3,
    letterSpacing: -0.1,
  },
});
