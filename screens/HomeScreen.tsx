import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLists } from '../utils/localStorage';
import { useAuth } from '../contexts/AuthContext';
import { forceSyncAllItems } from '../services/supabase/syncService';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import HeroSection from '../components/HeroSection';
import WeeklyChallengeCard from '../components/WeeklyChallengeCard';
import ProactiveRecipeCard from '../components/ProactiveRecipeCard';
import WeeklyRecapModal from '../components/WeeklyRecapModal';
import ReferralCard from '../components/ReferralCard';
import { SkeletonHomeContent } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../utils/designSystem';
import { scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { useGamification } from '../contexts/GamificationContext';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const { challengesState, gamificationData } = useGamification();
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [homeReady, setHomeReady] = useState(false);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);

  useEffect(() => {
    if (route.params?.showWeeklyRecap) {
      setShowWeeklyRecap(true);
      navigation.setParams({ showWeeklyRecap: undefined });
    }
  }, [route.params?.showWeeklyRecap]);

  // One-time force sync of local items to cloud
  useEffect(() => {
    if (!user) return;
    const syncKey = `force_sync_v2_done_${user.id}`;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(syncKey);
        logger.debug('[FORCE SYNC] key done:', !!done);
        if (done) return;
        logger.debug('[FORCE SYNC] Starting...');
        const { synced, errors } = await forceSyncAllItems(user.id);
        logger.debug(`[FORCE SYNC] Result: ${synced} synced, ${errors} errors`);
        if (errors === 0) {
          await AsyncStorage.setItem(syncKey, 'true');
        }
      } catch (err) {
        logger.error('[FORCE SYNC] Error:', err);
      }
    })();
  }, [user]);

  // Animations
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentSlide, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
    ]).start();
  }, []);

  const loadListsData = useCallback(async () => {
    try {
      const data = await loadLists();
      setLists(data);
    } catch (error) {
      logger.error('Erreur lors du chargement des listes:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos listes. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setHomeReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadListsData();
    }, [loadListsData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadListsData();
    setRefreshing(false);
  }, [loadListsData]);

  // Computed counts
  const urgentCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      return sum + list.items.filter(item => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days !== null && days >= 0 && days <= 1;
      }).length;
    }, 0);
  }, [lists]);

  const expiringSoonCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      return sum + list.items.filter(item => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days !== null && days >= 2 && days <= 3;
      }).length;
    }, 0);
  }, [lists]);

  const thrownCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      const thrownItems = list.items.filter((item) => item.status === 'thrown');
      return sum + thrownItems.length;
    }, 0);
  }, [lists]);

  const freshCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      return sum + list.items.filter(item => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days === null || days > 7;
      }).length;
    }, 0);
  }, [lists]);

  const onExpiringSoonPress = useCallback(() => navigation.navigate('ExpiringSoon'), [navigation]);
  const onThrownPress = useCallback(() => navigation.navigate('ThrownFoods'), [navigation]);
  const onCreateList = useCallback(() => navigation.navigate('CreateList'), [navigation]);

  return (
    <View style={styles.container}>
      {/* Fixed hero — content scrolls behind it */}
      <HeroSection
        urgentCount={urgentCount}
        expiringSoonCount={expiringSoonCount}
        thrownCount={thrownCount}
        freshCount={freshCount}
        onExpiringSoonPress={onExpiringSoonPress}
        onThrownPress={onThrownPress}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
            colors={[COLORS.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          }}
        >
          {!homeReady ? (
            <SkeletonHomeContent />
          ) : (
            <>
              <WeeklyChallengeCard challengesState={challengesState} />

              <ProactiveRecipeCard lists={lists} />

              {user && (gamificationData?.badges?.length ?? 0) >= 1 && (
                <ReferralCard userId={user.id} hasBadges={true} />
              )}

              {/* Spaces grid 2×2 */}
              <View style={styles.spacesSection}>
                <Text style={styles.sectionLabel}>MES ESPACES</Text>
                {lists.length === 0 ? (
                  <TouchableOpacity
                    onPress={onCreateList}
                    style={styles.createSpaceButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.createSpaceText}>Créer un espace →</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                  <View style={styles.spacesGrid}>
                    {[...lists]
                      .sort((a, b) => {
                        const urgentA = a.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d <= 1;
                        }).length;
                        const urgentB = b.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d <= 1;
                        }).length;
                        if (urgentA !== urgentB) return urgentB - urgentA;
                        const warnA = a.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d >= 2 && d <= 3;
                        }).length;
                        const warnB = b.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d >= 2 && d <= 3;
                        }).length;
                        return warnB - warnA;
                      })
                      .slice(0, 4)
                      .map(list => {
                        const spaceUrgent = list.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d <= 1;
                        }).length;
                        const spaceWarn = list.items.filter(i => {
                          if (i.status === 'consumed' || i.status === 'thrown') return false;
                          const d = getDaysUntilExpiration(i.expirationDate);
                          return d !== null && d >= 2 && d <= 3;
                        }).length;
                        const spaceState = spaceUrgent > 0 ? 'urgent' : spaceWarn > 0 ? 'warning' : 'calm';
                        const borderColor =
                          spaceState === 'urgent' ? 'rgba(220,38,38,0.25)' :
                          spaceState === 'warning' ? 'rgba(251,146,60,0.35)' :
                          'rgba(60,110,71,0.12)';
                        const barColor =
                          spaceState === 'urgent' ? '#DC2626' :
                          spaceState === 'warning' ? '#FB923C' :
                          COLORS.status.fresh;
                        const activeCount = list.items.filter(i => i.status !== 'consumed' && i.status !== 'thrown').length;
                        const subText =
                          spaceState === 'urgent' ? `${spaceUrgent} périment 🚨` :
                          spaceState === 'warning' ? `${spaceWarn} expirent ⚠️` :
                          `${activeCount} alim.`;
                        const subColor =
                          spaceState === 'urgent' ? '#DC2626' :
                          spaceState === 'warning' ? '#FB923C' :
                          COLORS.text.tertiary;

                        const iconColor = list.color || COLORS.primary[500];

                        return (
                          <TouchableOpacity
                            key={list.id}
                            style={[styles.spaceCard, { borderColor }]}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate('InventoryList', { listId: list.id, listTitle: list.title, listColor: list.color, listIcon: list.icon })}
                          >
                            <View style={styles.spaceCardHeader}>
                              <View style={[styles.spaceCardIconBg, { backgroundColor: iconColor + '20' }]}>
                                <Ionicons
                                  name={(list.icon as any) || 'apps-outline'}
                                  size={22}
                                  color={iconColor}
                                />
                              </View>
                              <Text style={[styles.spaceCardName, { color: iconColor }]} numberOfLines={2}>
                                {list.title}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.spaceCardSub, { color: subColor }]} numberOfLines={1}>
                                {subText}
                              </Text>
                              <View style={styles.spaceCardBar}>
                                <View style={[styles.spaceCardBarFill, { backgroundColor: barColor }]} />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                    {/* Bouton créer un espace */}
                    {lists.length < 4 && (
                      <TouchableOpacity
                        style={styles.spaceCardCreate}
                        activeOpacity={0.7}
                        onPress={onCreateList}
                      >
                        <Ionicons name="add" size={22} color={COLORS.primary[500]} />
                        <Text style={styles.spaceCardCreateText}>Nouvel{'\n'}espace</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {lists.length >= 4 && (
                    <TouchableOpacity
                      onPress={onCreateList}
                      style={styles.addSpaceLink}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={COLORS.primary[500]} />
                      <Text style={styles.addSpaceLinkText}>Ajouter un espace</Text>
                    </TouchableOpacity>
                  )}
                  </>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Weekly recap modal */}
      <WeeklyRecapModal
        visible={showWeeklyRecap}
        onClose={() => setShowWeeklyRecap(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleSpacing(isSmallScreen ? 100 : 120),
  },
  spacesSection: {
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  sectionLabel: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: 0.5,
    marginBottom: scaleSpacing(8),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
  },
  spacesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    rowGap: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(isSmallScreen ? 8 : 12),
  },
  spaceCard: {
    width: '44%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: scaleSpacing(12),
    justifyContent: 'space-between',
  },
  spaceCardHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSpacing(8),
  },
  spaceCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceCardName: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
    textAlign: 'center',
  },
  spaceCardCreate: {
    width: '44%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(60,110,71,0.2)',
    borderStyle: 'dashed',
    padding: scaleSpacing(10),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSpacing(4),
  },
  spaceCardCreateText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: COLORS.primary[500],
    textAlign: 'center',
  },
  addSpaceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(4),
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    paddingTop: scaleSpacing(8),
  },
  addSpaceLinkText: {
    fontSize: scaleFontSize(12),
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  spaceCardSub: {
    fontSize: scaleFontSize(9),
  },
  spaceCardBar: {
    height: 2,
    backgroundColor: 'rgba(60,110,71,0.12)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  spaceCardBarFill: {
    height: '100%',
    width: '60%',
    borderRadius: 1,
  },
  createSpaceButton: {
    paddingVertical: scaleSpacing(10),
  },
  createSpaceText: {
    fontSize: scaleFontSize(13),
    color: COLORS.primary[500],
    fontWeight: '600',
  },
});
