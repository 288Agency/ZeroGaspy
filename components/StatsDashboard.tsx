import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { UserStats } from '../types';
import { calculateUserStats } from '../services/statsService';
import StatsCard from './StatsCard';

/**
 * Dashboard complet des statistiques utilisateur
 * Affiche économies, impact environnemental, et séries
 */
export default function StatsDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await calculateUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C6E47" />
        <Text style={styles.loadingText}>Calcul de vos économies...</Text>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  // Formater les valeurs
  const savedFormatted = stats.totalSaved.toFixed(2);
  const wastedFormatted = stats.totalWasted.toFixed(2);
  const netSavingsFormatted = stats.netSavings.toFixed(2);
  const co2Formatted = stats.co2AvoidedKg.toFixed(1);
  const foodSavedFormatted = stats.foodSavedKg.toFixed(1);

  // Calculer le taux de réussite
  const totalItems = stats.itemsConsumed + stats.itemsThrown;
  const successRate = totalItems > 0
    ? Math.round((stats.itemsConsumed / totalItems) * 100)
    : 100;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3C6E47']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Tes Économies</Text>
        <Text style={styles.subtitle}>
          Depuis {new Date(stats.periodStart).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Économies nettes (carte principale) */}
      <View style={styles.mainCard}>
        <StatsCard
          icon="💰"
          value={`${netSavingsFormatted}€`}
          label="Économies nettes"
          subtitle={`${savedFormatted}€ sauvés - ${wastedFormatted}€ gaspillés`}
          colors={['#3C6E47', '#5A9A6F']}
          size="large"
        />
      </View>

      {/* Grille de stats */}
      <View style={styles.grid}>
        {/* Taux de réussite */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="🎯"
            value={`${successRate}%`}
            label="Taux de réussite"
            subtitle={`${stats.itemsConsumed} consommés`}
            colors={['#10B981', '#34D399']}
            size="medium"
          />
        </View>

        {/* Série actuelle */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="🔥"
            value={stats.currentStreak}
            label="Jours sans gaspillage"
            subtitle={`Record: ${stats.longestStreak}`}
            colors={['#F59E0B', '#FBBF24']}
            size="medium"
          />
        </View>
      </View>

      {/* Impact environnemental */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Impact Environnemental</Text>
      </View>

      <View style={styles.grid}>
        {/* Nourriture sauvée */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="🥗"
            value={`${foodSavedFormatted} kg`}
            label="Nourriture sauvée"
            colors={['#8B5CF6', '#A78BFA']}
            size="small"
          />
        </View>

        {/* CO2 évité */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="🌍"
            value={`${co2Formatted} kg`}
            label="CO2 évité"
            subtitle={`${Math.round(parseFloat(co2Formatted) / 0.12)} km en voiture`}
            colors={['#3B82F6', '#60A5FA']}
            size="small"
          />
        </View>
      </View>

      {/* Aliments suivis */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Activité</Text>
      </View>

      <View style={styles.grid}>
        {/* Aliments actifs */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="📦"
            value={stats.itemsActive}
            label="Aliments suivis"
            colors={['#6366F1', '#818CF8']}
            size="small"
          />
        </View>

        {/* Aliments jetés */}
        <View style={styles.gridItem}>
          <StatsCard
            icon="🗑️"
            value={stats.itemsThrown}
            label="Aliments jetés"
            colors={['#EF4444', '#F87171']}
            size="small"
          />
        </View>
      </View>

      {/* Message de motivation */}
      {stats.currentStreak >= 7 && (
        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>🎉</Text>
          <Text style={styles.motivationTitle}>Bravo !</Text>
          <Text style={styles.motivationText}>
            {stats.currentStreak} jours sans gaspillage ! Continue comme ça !
          </Text>
        </View>
      )}

      {stats.netSavings >= 50 && (
        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>💪</Text>
          <Text style={styles.motivationTitle}>Excellent !</Text>
          <Text style={styles.motivationText}>
            Tu as déjà économisé {netSavingsFormatted}€. Soit {Math.round(stats.netSavings / 3)}€ par mois !
          </Text>
        </View>
      )}

      {/* Espacement bas */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5E6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F5E6',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6A8A6E',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3C6E47',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6A8A6E',
  },
  mainCard: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C6E47',
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  motivationCard: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3C6E47',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  motivationIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  motivationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3C6E47',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: '#6A8A6E',
    textAlign: 'center',
    lineHeight: 20,
  },
});
