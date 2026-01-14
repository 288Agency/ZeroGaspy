import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  subtitle?: string;
  colors?: [string, string];
  size?: 'small' | 'medium' | 'large';
}

/**
 * Carte de statistique avec gradient
 * Affiche une métrique unique de façon visuelle
 */
export default function StatsCard({
  icon,
  value,
  label,
  subtitle,
  colors = ['#3C6E47', '#5A9A6F'],
  size = 'medium',
}: StatsCardProps) {
  const sizeStyles = {
    small: styles.containerSmall,
    medium: styles.containerMedium,
    large: styles.containerLarge,
  };

  const valueSizes = {
    small: styles.valueSmall,
    medium: styles.valueMedium,
    large: styles.valueLarge,
  };

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, sizeStyles[size]]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <Text style={[styles.value, valueSizes[size]]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerSmall: {
    minHeight: 100,
  },
  containerMedium: {
    minHeight: 140,
  },
  containerLarge: {
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  icon: {
    fontSize: 32,
  },
  value: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  valueSmall: {
    fontSize: 24,
  },
  valueMedium: {
    fontSize: 32,
  },
  valueLarge: {
    fontSize: 40,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.95,
  },
  subtitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
});
