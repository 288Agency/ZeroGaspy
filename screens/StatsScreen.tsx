import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import Header from '../components/Header';
import StatsDashboard from '../components/StatsDashboard';

/**
 * Écran des statistiques et économies
 * Affiche le dashboard complet avec toutes les métriques
 */
export default function StatsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="Mes Économies" showBackButton={false} />
      <StatsDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5E6',
  },
});
