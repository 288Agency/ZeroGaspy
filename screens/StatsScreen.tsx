import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import StatsDashboard from '../components/StatsDashboard';

/**
 * Écran des statistiques et économies
 * Affiche le dashboard complet avec toutes les métriques
 */
export default function StatsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Mes Économies" onBack={() => navigation.goBack()} />
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
