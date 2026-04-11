import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getMonthlySavings, getMonthlyWasted, getMonthlySavingsGoal } from '../services/monthlySavingsService';
import { COLORS } from '../utils/designSystem';
import { scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MonthlySavingsCard() {
  const navigation = useNavigation<NavigationProp>();
  const [savings, setSavings] = useState(0);
  const [wasted, setWasted] = useState(0);
  const [goal, setGoal] = useState(50);
  const [loaded, setLoaded] = useState(false);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [s, w, g] = await Promise.all([
        getMonthlySavings(),
        getMonthlyWasted(),
        getMonthlySavingsGoal(),
      ]);
      setSavings(s);
      setWasted(w);
      setGoal(g);
      setLoaded(true);
      const progress = Math.min(s / g, 1);
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      logger.error('MonthlySavingsCard load error:', error);
      setLoaded(true);
    }
  };

  const monthLabel = new Date().toLocaleString('fr-FR', { month: 'long' });

  if (!loaded) return null;

  const progressPercent = Math.min(Math.round((savings / goal) * 100), 100);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Stats')}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.primary[500]} />
          <Text style={styles.label}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
        </View>
        <Text style={styles.hint}>Voir stats →</Text>
      </View>

      <View style={styles.amounts}>
        <View>
          <Text style={styles.savedAmount}>~{savings.toFixed(0)} €</Text>
          <Text style={styles.savedLabel}>économisés</Text>
        </View>
        {wasted > 0 && (
          <View style={styles.wastedBlock}>
            <Text style={styles.wastedAmount}>{wasted.toFixed(0)} €</Text>
            <Text style={styles.wastedLabel}>gaspillés</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {progressPercent}% de l'objectif {goal} €
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginBottom: scaleSpacing(12),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: scaleSpacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(60,110,71,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
  },
  label: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  hint: {
    fontSize: scaleFontSize(11),
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scaleSpacing(20),
    marginBottom: scaleSpacing(12),
  },
  savedAmount: {
    fontSize: scaleFontSize(32),
    fontWeight: '800',
    color: COLORS.primary[500],
    lineHeight: scaleFontSize(36),
  },
  savedLabel: {
    fontSize: scaleFontSize(11),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  wastedBlock: {
    paddingBottom: scaleSpacing(2),
  },
  wastedAmount: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: COLORS.semantic.dangerLight,
  },
  wastedLabel: {
    fontSize: scaleFontSize(10),
    color: COLORS.text.tertiary,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(60,110,71,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: scaleSpacing(4),
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: scaleFontSize(10),
    color: COLORS.text.tertiary,
  },
});
