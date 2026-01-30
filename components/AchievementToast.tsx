import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { Badge, getTierBackgroundColor, getTierColor } from '../services/gamificationService';

interface AchievementToastProps {
  badge: Badge | null;
  xpGained: number;
  levelUp: boolean;
  newLevel?: number;
  visible: boolean;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export default function AchievementToast({
  badge,
  xpGained,
  levelUp,
  newLevel,
  visible,
  onHide,
}: AchievementToastProps) {
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entree
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();

      // Auto-hide apres 4 secondes
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <View
        className="rounded-2xl p-4 shadow-lg"
        style={{
          backgroundColor: badge ? getTierBackgroundColor(badge.tier) : '#ECFDF5',
          borderWidth: 2,
          borderColor: badge ? getTierColor(badge.tier) : '#10B981',
        }}
      >
        {levelUp && newLevel ? (
          // Level Up Toast
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-[#3C6E47] items-center justify-center mr-4">
              <Text className="text-white text-xl font-bold">{newLevel}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#3C6E47] font-bold text-lg">
                Niveau superieur !
              </Text>
              <Text className="text-[#6A8A6E]">
                Vous etes maintenant niveau {newLevel}
              </Text>
            </View>
            <Text className="text-3xl">🎉</Text>
          </View>
        ) : badge ? (
          // Badge Toast
          <View className="flex-row items-center">
            <View
              className="w-14 h-14 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: 'white' }}
            >
              <Text className="text-3xl">{badge.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#3C6E47] text-xs font-medium uppercase">
                Nouveau badge !
              </Text>
              <Text className="text-[#3C6E47] font-bold text-lg">
                {badge.name}
              </Text>
              <Text className="text-[#6A8A6E] text-sm">
                +{badge.xpReward} XP
              </Text>
            </View>
          </View>
        ) : xpGained > 0 ? (
          // XP Toast
          <View className="flex-row items-center justify-center">
            <Text className="text-[#3C6E47] font-bold text-lg">
              +{xpGained} XP
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
