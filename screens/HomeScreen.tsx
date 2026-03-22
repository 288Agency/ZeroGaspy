import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Text,
  StyleSheet,
  Alert,
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
import SpacesGrid from '../components/SpacesGrid';
import ProactiveRecipeCard from '../components/ProactiveRecipeCard';
import FeedbackModal from '../components/FeedbackModal';
import WeeklyRecapModal from '../components/WeeklyRecapModal';
import ReferralCard from '../components/ReferralCard';
import { SkeletonHomeContent } from '../components/Skeleton';

import { COLORS } from '../utils/designSystem';
import { scaleSpacing, isSmallScreen } from '../utils/responsive';
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
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
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
  const expiringSoonCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      const expiringItems = list.items.filter((item) => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days !== null && days >= 0 && days <= 7;
      });
      return sum + expiringItems.length;
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
        <HeroSection
          expiringSoonCount={expiringSoonCount}
          thrownCount={thrownCount}
          freshCount={freshCount}
          onExpiringSoonPress={onExpiringSoonPress}
          onThrownPress={onThrownPress}
          onFeedbackPress={() => setFeedbackModalVisible(true)}
        />

        {/* Main content — cream background covers the container's dark green */}
        <Animated.View
          style={{
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
            backgroundColor: COLORS.secondary.cream,
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

              <SpacesGrid
                lists={lists}
                onCreateList={onCreateList}
                onListDeleted={loadListsData}
              />
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Feedback modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />

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
    backgroundColor: '#1A3020', // hero top color — shows when overscrolling at top
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: scaleSpacing(isSmallScreen ? 100 : 120),
    flexGrow: 1,
  },
});
