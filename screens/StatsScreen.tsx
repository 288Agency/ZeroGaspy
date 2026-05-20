import React, { useState, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../utils/designSystem';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import StatsDashboard from '../components/StatsDashboard';
import { PaywallSheet } from '../components/ds';
import { usePaywallSheetProps } from '../hooks/usePaywallSheetProps';

/**
 * Écran des statistiques et économies
 * Affiche le dashboard complet avec toutes les métriques
 */
export default function StatsScreen() {
  const { t } = useTranslation();
  const paywallProps = usePaywallSheetProps();
  const [showPaywall, setShowPaywall] = useState(false);
  const shareHandlerRef = useRef<(() => void) | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('stats.impactTitle')}
        showBackButton={false}
        showIcon
        rightIcon="share-social-outline"
        onRightPress={() => shareHandlerRef.current?.()}
      />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
});
