import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import StatsDashboard from '../components/StatsDashboard';
import PaywallModal from '../components/PaywallModal';

/**
 * Écran des statistiques et économies
 * Affiche le dashboard complet avec toutes les métriques
 */
export default function StatsScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Mon Impact" showBackButton={false} />
      <StatsDashboard onOpenPaywall={() => setShowPaywall(true)} />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="general"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5E6',
  },
});
