import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { List } from '../types';
import ListCard from './ListCard';
import IndicatorBadge from './IndicatorBadge';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface TodayOverviewProps {
  featuredLists: List[];
  urgentItemsCount: number;
}

export default function TodayOverview({
  featuredLists,
  urgentItemsCount,
}: TodayOverviewProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {/* Header avec indicateur d'urgence */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {t('home.today')}
          </Text>
          <Text style={styles.subtitle}>
            {t('home.activeLists', { count: featuredLists.length })}
          </Text>
        </View>
        {urgentItemsCount > 0 && (
          <IndicatorBadge count={urgentItemsCount} variant="danger" size="lg" />
        )}
      </View>

      {/* Liste des listes principales */}
      {featuredLists.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {featuredLists.map((list) => (
            <View key={list.id} style={styles.listCardWrapper}>
              <ListCard list={list} variant="featured" urgentCount={0} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('home.noMainList')}
          </Text>
          <Text style={styles.emptySubtext}>
            {t('home.createListToStart')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral.gray900,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.neutral.gray500,
  },
  scrollView: {
    marginBottom: SPACING.lg,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },
  listCardWrapper: {
    marginRight: SPACING.lg,
    width: 280,
  },
  emptyState: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['2xl'],
    padding: SPACING['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.neutral.gray500,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.neutral.gray400,
    textAlign: 'center',
  },
});
