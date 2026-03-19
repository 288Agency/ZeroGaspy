import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { loadLists } from '../utils/localStorage';
import { getGamificationData } from '../services/gamificationService';

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
}

export default function WeeklyRecapModal({ visible, onClose }: WeeklyRecapModalProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
        if (item.status === 'consumed' && item.consumedAt) {
          const consumedDate = new Date(item.consumedAt);
          if (consumedDate >= weekAgo) {
            itemsSaved++;
            if (item.price) eurosSaved += item.price;
          }
        } else if (item.status === 'thrown') {
          itemsThrown++;
        }
      }
    }

    setStats({
      itemsSaved,
      itemsThrown,
      eurosSaved: Math.round(eurosSaved * 100) / 100,
      currentStreak: gamification.streaks.currentNoWaste,
      xpGained: gamification.totalXp,
    });
  };

  const handleShare = async () => {
    if (!stats) return;
    const message = t('weeklyRecap.shareMessage', {
      saved: stats.itemsSaved,
      euros: stats.eurosSaved.toFixed(2),
      streak: stats.currentStreak,
    });
    try {
      await Share.share({ message });
    } catch {}
  };

  if (!visible || !stats) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>📊</Text>
              <Text style={styles.title}>{t('weeklyRecap.title')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={scaleSize(22)} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Stats grid */}
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

            {/* Share button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={scaleSize(18)} color={COLORS.neutral.white} />
              <Text style={styles.shareText}>{t('weeklyRecap.share')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
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
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
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
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSpacing(12),
    marginBottom: scaleSpacing(20),
  },
  statCard: {
    width: '47%',
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(14),
    alignItems: 'center',
  },
  statIconContainer: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleSpacing(8),
  },
  statValue: {
    fontSize: scaleFontSize(isSmallScreen ? 22 : 26),
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: scaleFontSize(11),
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    paddingVertical: scaleSpacing(14),
    borderRadius: RADIUS.xl,
    gap: scaleSpacing(8),
  },
  shareText: {
    color: COLORS.neutral.white,
    fontSize: scaleFontSize(15),
    fontWeight: '700',
  },
});
