import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  UserGamification,
  Badge,
  BadgeCategory,
  BADGES,
  getGamificationData,
  getBadgeById,
  getTierColor,
  getTierBackgroundColor,
  getCategoryName,
  getCategoryIcon,
  getLevelTitle,
  markAllBadgesAsSeen,
} from '../services/gamificationService';
import PressableScale from './PressableScale';

interface AchievementsModalProps {
  visible: boolean;
  onClose: () => void;
}

type ViewMode = 'overview' | 'badges' | 'stats';

const CATEGORIES: BadgeCategory[] = [
  'zero_waste',
  'saver',
  'streak',
  'explorer',
  'organizer',
  'milestone',
];

export default function AchievementsModal({ visible, onClose }: AchievementsModalProps) {
  const [gamificationData, setGamificationData] = useState<UserGamification | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    const data = await getGamificationData();
    setGamificationData(data);
  };

  const handleClose = async () => {
    await markAllBadgesAsSeen();
    setViewMode('overview');
    setSelectedCategory(null);
    onClose();
  };

  const getUnlockedBadgesCount = (category?: BadgeCategory): number => {
    if (!gamificationData) return 0;
    const badges = category
      ? BADGES.filter(b => b.category === category)
      : BADGES;
    return badges.filter(b =>
      gamificationData.badges.some(ub => ub.badgeId === b.id && ub.unlockedAt)
    ).length;
  };

  const getTotalBadgesCount = (category?: BadgeCategory): number => {
    return category
      ? BADGES.filter(b => b.category === category).length
      : BADGES.length;
  };

  const getBadgeProgress = (badge: Badge): number => {
    if (!gamificationData) return 0;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    if (!userBadge) return 0;
    return Math.min(userBadge.progress / badge.requirement, 1);
  };

  const isBadgeUnlocked = (badge: Badge): boolean => {
    if (!gamificationData) return false;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    return userBadge?.unlockedAt ? true : false;
  };

  const isBadgeNew = (badge: Badge): boolean => {
    if (!gamificationData) return false;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    return userBadge?.isNew || false;
  };

  const xpProgress = gamificationData
    ? gamificationData.xp / gamificationData.xpToNextLevel
    : 0;

  const renderOverview = () => (
    <View>
      {/* Niveau et XP */}
      <View className="bg-[#3C6E47] rounded-2xl p-5 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white/70 text-sm">Niveau {gamificationData?.level}</Text>
            <Text className="text-white text-2xl font-bold">
              {getLevelTitle(gamificationData?.level || 1)}
            </Text>
          </View>
          <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
            <Text className="text-white text-2xl font-bold">
              {gamificationData?.level || 1}
            </Text>
          </View>
        </View>

        {/* Barre XP */}
        <View className="mb-2">
          <View className="flex-row justify-between mb-1">
            <Text className="text-white/70 text-xs">XP</Text>
            <Text className="text-white/70 text-xs">
              {gamificationData?.xp || 0} / {gamificationData?.xpToNextLevel || 100}
            </Text>
          </View>
          <View className="h-3 bg-white/20 rounded-full overflow-hidden">
            <View
              className="h-full bg-[#A3C9A8] rounded-full"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </View>
        </View>

        <Text className="text-white/50 text-xs text-center">
          XP total: {gamificationData?.totalXp || 0}
        </Text>
      </View>

      {/* Streaks */}
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-4 items-center">
          <Text className="text-3xl mb-1">🔥</Text>
          <Text className="text-orange-600 text-2xl font-bold">
            {gamificationData?.streaks.currentDaily || 0}
          </Text>
          <Text className="text-orange-600/70 text-xs text-center">Jours d'affilee</Text>
        </View>
        <View className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 items-center">
          <Text className="text-3xl mb-1">🌱</Text>
          <Text className="text-green-600 text-2xl font-bold">
            {gamificationData?.streaks.currentNoWaste || 0}
          </Text>
          <Text className="text-green-600/70 text-xs text-center">Zero gaspillage</Text>
        </View>
      </View>

      {/* Badges Resume */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-[#3C6E47] font-bold text-lg">Badges</Text>
        <TouchableOpacity onPress={() => setViewMode('badges')}>
          <Text className="text-[#3C6E47] font-medium">Voir tout →</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap gap-2 mb-6">
        {BADGES.filter(b => isBadgeUnlocked(b)).slice(0, 8).map(badge => (
          <View
            key={badge.id}
            className="w-14 h-14 rounded-xl items-center justify-center"
            style={{ backgroundColor: getTierBackgroundColor(badge.tier) }}
          >
            <Text className="text-2xl">{badge.icon}</Text>
            {isBadgeNew(badge) && (
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </View>
        ))}
        {getUnlockedBadgesCount() === 0 && (
          <Text className="text-[#6A8A6E] text-sm italic">
            Aucun badge debloque pour le moment
          </Text>
        )}
      </View>

      {/* Statistiques Resume */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-[#3C6E47] font-bold text-lg">Statistiques</Text>
        <TouchableOpacity onPress={() => setViewMode('stats')}>
          <Text className="text-[#3C6E47] font-medium">Details →</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-[#F7F5E6] rounded-xl p-4">
        <View className="flex-row justify-between mb-2">
          <Text className="text-[#6A8A6E]">Aliments sauves</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalFoodsSaved || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-[#6A8A6E]">Aliments ajoutes</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalFoodsAdded || 0}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[#6A8A6E]">Jours actifs</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.daysActive || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBadges = () => (
    <View>
      <TouchableOpacity
        onPress={() => {
          if (selectedCategory) {
            setSelectedCategory(null);
          } else {
            setViewMode('overview');
          }
        }}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-2">
        {selectedCategory ? getCategoryName(selectedCategory) : 'Tous les Badges'}
      </Text>
      <Text className="text-[#6A8A6E] mb-6">
        {getUnlockedBadgesCount(selectedCategory || undefined)} / {getTotalBadgesCount(selectedCategory || undefined)} debloques
      </Text>

      {selectedCategory ? (
        // Afficher les badges de la categorie
        <View className="gap-3">
          {BADGES.filter(b => b.category === selectedCategory).map(badge => {
            const unlocked = isBadgeUnlocked(badge);
            const progress = getBadgeProgress(badge);
            const userBadge = gamificationData?.badges.find(b => b.badgeId === badge.id);

            return (
              <View
                key={badge.id}
                className={`rounded-xl p-4 border ${
                  unlocked
                    ? 'bg-white border-[#3C6E47]/20'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-14 h-14 rounded-xl items-center justify-center mr-4 ${
                      unlocked ? '' : 'opacity-40'
                    }`}
                    style={{ backgroundColor: unlocked ? getTierBackgroundColor(badge.tier) : '#E5E5E5' }}
                  >
                    <Text className="text-2xl">{unlocked ? badge.icon : '🔒'}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className={`font-semibold ${unlocked ? 'text-[#3C6E47]' : 'text-gray-400'}`}>
                        {badge.name}
                      </Text>
                      {isBadgeNew(badge) && (
                        <View className="ml-2 px-2 py-0.5 bg-red-500 rounded-full">
                          <Text className="text-white text-xs font-bold">NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text className={`text-sm ${unlocked ? 'text-[#6A8A6E]' : 'text-gray-400'}`}>
                      {badge.description}
                    </Text>
                    {!unlocked && (
                      <View className="mt-2">
                        <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-[#A3C9A8] rounded-full"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </View>
                        <Text className="text-gray-400 text-xs mt-1">
                          {userBadge?.progress || 0} / {badge.requirement}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <View
                      className="w-3 h-3 rounded-full mb-1"
                      style={{ backgroundColor: getTierColor(badge.tier) }}
                    />
                    <Text className="text-[#6A8A6E] text-xs">+{badge.xpReward} XP</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        // Afficher les categories
        <View className="gap-3">
          {CATEGORIES.map(category => (
            <PressableScale
              key={category}
              onPress={() => setSelectedCategory(category)}
              className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 flex-row items-center"
              hapticType="light"
            >
              <View className="w-12 h-12 rounded-xl bg-[#A3C9A8]/30 items-center justify-center mr-4">
                <Text className="text-2xl">{getCategoryIcon(category)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[#3C6E47] font-semibold">{getCategoryName(category)}</Text>
                <Text className="text-[#6A8A6E] text-sm">
                  {getUnlockedBadgesCount(category)} / {getTotalBadgesCount(category)} badges
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );

  const renderStats = () => (
    <View>
      <TouchableOpacity
        onPress={() => setViewMode('overview')}
        className="flex-row items-center mb-4"
      >
        <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        <Text className="text-[#3C6E47] font-semibold ml-2">Retour</Text>
      </TouchableOpacity>

      <Text className="text-xl font-bold text-[#3C6E47] mb-6">
        Statistiques detaillees
      </Text>

      {/* Streaks */}
      <Text className="text-[#3C6E47] font-semibold mb-3">Series</Text>
      <View className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 mb-6">
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Serie actuelle (jours)</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.streaks.currentDaily || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Record de serie</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.streaks.longestDaily || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Zero gaspillage actuel</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.streaks.currentNoWaste || 0} jours
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[#6A8A6E]">Record zero gaspillage</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.streaks.longestNoWaste || 0} jours
          </Text>
        </View>
      </View>

      {/* Aliments */}
      <Text className="text-[#3C6E47] font-semibold mb-3">Aliments</Text>
      <View className="bg-white border border-[#3C6E47]/20 rounded-xl p-4 mb-6">
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Total ajoutes</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalFoodsAdded || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Consommes</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalFoodsConsumed || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Sauves (avant expiration)</Text>
          <Text className="text-green-600 font-semibold">
            {gamificationData?.stats.totalFoodsSaved || 0}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[#6A8A6E]">Jetes</Text>
          <Text className="text-red-500 font-semibold">
            {gamificationData?.stats.totalFoodsThrown || 0}
          </Text>
        </View>
      </View>

      {/* Activite */}
      <Text className="text-[#3C6E47] font-semibold mb-3">Activite</Text>
      <View className="bg-white border border-[#3C6E47]/20 rounded-xl p-4">
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Jours actifs total</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.daysActive || 0}
          </Text>
        </View>
        <View className="flex-row justify-between mb-3 pb-3 border-b border-[#3C6E47]/10">
          <Text className="text-[#6A8A6E]">Recettes consultees</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalRecipesViewed || 0}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-[#6A8A6E]">Listes creees</Text>
          <Text className="text-[#3C6E47] font-semibold">
            {gamificationData?.stats.totalListsCreated || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'badges':
        return renderBadges();
      case 'stats':
        return renderStats();
      default:
        return renderOverview();
    }
  };

  if (!gamificationData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2 border-b border-[#3C6E47]/10">
          <View className="w-10" />
          <Text className="text-[#3C6E47] font-bold text-lg">Mes Succes</Text>
          <TouchableOpacity onPress={handleClose} className="w-10 items-end">
            <Ionicons name="close" size={24} color="#3C6E47" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}
