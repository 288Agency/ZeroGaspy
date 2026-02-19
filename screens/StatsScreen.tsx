import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../utils/designSystem';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import StatsDashboard from '../components/StatsDashboard';
import PaywallModal from '../components/PaywallModal';

/**
 * Écran des statistiques et économies
 * Affiche le dashboard complet avec toutes les métriques
 */
export default function StatsScreen() {
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('stats.impactTitle')} showBackButton={false} />
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
    backgroundColor: COLORS.secondary.cream,
  },
});
