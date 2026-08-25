import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { COLORS, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { loadLists } from '../utils/localStorage';
import { getGamificationData } from '../services/gamificationService';
import { useSubscription } from '../contexts/SubscriptionContext';
import ShareRecapCard from './ShareRecapCard';
import { shareRecapImage } from '../services/shareRecapService';

interface WeeklyRecapModalProps {
  visible: boolean;
  onClose: () => void;
}

interface WeekStats {
  itemsSaved: number;
  itemsThrown: number;
  eurosSaved: number;
  currentStreak: number;
  xpGained: number;
  co2AvoidedKg: number;
}

const DEFAULT_ITEM_PRICE = 3;

export default function WeeklyRecapModal({ visible, onClose }: WeeklyRecapModalProps) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [sharing, setSharing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible) {
      loadWeekStats();
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      setStats(null);
    }
  }, [visible]);

  const loadWeekStats = async () => {
    const lists = await loadLists();
    const gamification = await getGamificationData();

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let itemsSaved = 0;
    let itemsThrown = 0;
    let eurosSaved = 0;

    for (const list of lists) {
      for (const item of list.items) {
        if (!item.consumedAt) continue;
        const eventDate = new Date(item.consumedAt);
        if (eventDate < weekAgo) continue;

        if (item.status === 'consumed') {
          itemsSaved++;
          const price = item.price && item.price > 0 ? item.price : DEFAULT_ITEM_PRICE;
          eurosSaved += price * (item.quantity || 1);
        } else if (item.status === 'thrown') {
          itemsThrown++;
        }
      }
    }

    // ~0.5 kg CO2 évité par aliment sauvé (même ordre de grandeur que Stats)
    const co2AvoidedKg = Math.round(itemsSaved * 0.5 * 10) / 10;

    setStats({
      itemsSaved,
      itemsThrown,
      eurosSaved: Math.round(eurosSaved * 100) / 100,
      currentStreak: gamification.streaks.currentNoWaste,
      xpGained: gamification.totalXp,
      co2AvoidedKg,
    });
  };

  const handleShare = async () => {
    if (!stats || sharing) return;
    setSharing(true);
    try {
      // Laisse un frame pour que ViewShot soit monté avec les stats à jour
      await new Promise((r) => setTimeout(r, 80));
      await shareRecapImage(viewShotRef);
    } catch (error: any) {
      if (!error?.message?.includes('User did not share') && !error?.message?.includes('did not share')) {
        Alert.alert(
          t('common.error'),
          t('weeklyRecap.shareError', { defaultValue: 'Impossible de partager le récap' }),
        );
      }
    } finally {
      setSharing(false);
    }
  };

  if (!visible || !stats) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.header}>
              <Text style={styles.emoji}>📊</Text>
              <Text style={styles.title}>{t('weeklyRecap.title')}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={scaleSize(22)} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                icon="leaf"
                iconColor="#4CAF50"
                value={stats.itemsSaved.toString()}
                label={t('weeklyRecap.itemsSaved', { count: stats.itemsSaved })}
                bgColor="#E8F5E9"
              />
              <StatCard
                icon="trash"
                iconColor="#F44336"
                value={stats.itemsThrown.toString()}
                label={t('weeklyRecap.itemsThrown', { count: stats.itemsThrown })}
                bgColor="#FFEBEE"
              />
              <StatCard
                icon="wallet"
                iconColor="#FF9800"
                value={`${stats.eurosSaved.toFixed(2)}€`}
                label={t('weeklyRecap.eurosSaved', { amount: stats.eurosSaved.toFixed(2) })}
                bgColor="#FFF3E0"
              />
              <StatCard
                icon="flame"
                iconColor="#E91E63"
                value={`${stats.currentStreak}`}
                label={t('weeklyRecap.streak', { count: stats.currentStreak })}
                bgColor="#FCE4EC"
              />
            </View>

            <TouchableOpacity
              style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={COLORS.neutral.white} />
              ) : (
                <Ionicons name="share-outline" size={scaleSize(18)} color={COLORS.neutral.white} />
              )}
              <Text style={styles.shareText}>
                {sharing ? t('common.loading') : t('weeklyRecap.share')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>

      {/* Off-screen card for PNG capture — € visible si économies (boucle virale) */}
      <ShareRecapCard
        ref={viewShotRef}
        itemsConsumed={stats.itemsSaved}
        itemsThrown={stats.itemsThrown}
        netSavings={stats.eurosSaved}
        co2AvoidedKg={stats.co2AvoidedKg}
        currentStreak={stats.currentStreak}
        isPremium={isPremium || stats.eurosSaved > 0}
      />
    </Modal>
  );
}

function StatCard({
  icon,
  iconColor,
  value,
  label,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={[styles.statIconContainer, { backgroundColor: hexToRgba(iconColor, 0.15) }]}>
        <Ionicons name={icon} size={scaleSize(20)} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(24),
  },
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: scaleSpacing(24),
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSpacing(20),
  },
  emoji: {
    fontSize: scaleSize(28),
    marginRight: scaleSpacing(10),
  },
  title: {
    flex: 1,
    fontSize: scaleFontSize(isSmallScreen ? 18 : 20),
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: scaleSpacing(4),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSpacing(12),
    marginBottom: scaleSpacing(20),
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(14),
    minHeight: scaleSize(100),
  },
  statIconContainer: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSpacing(8),
  },
  statValue: {
    fontSize: scaleFontSize(22),
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSpacing(8),
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.full,
    paddingVertical: scaleSpacing(14),
  },
  shareButtonDisabled: {
    opacity: 0.75,
  },
  shareText: {
    color: COLORS.neutral.white,
    fontSize: scaleFontSize(15),
    fontWeight: '700',
  },
});
