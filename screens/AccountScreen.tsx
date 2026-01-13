import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { loadLists } from '../utils/localStorage';
import { List, FoodItem } from '../types';
import FeedbackModal from '../components/FeedbackModal';
import PressableScale from '../components/PressableScale';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
  requestNotificationPermissions,
  NotificationSettings,
} from '../services/notificationService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lists, setLists] = useState<List[]>([]);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    dailyReminder: true,
    dailyReminderTime: '09:00',
    daysBeforeExpiration: 3,
  });

  const loadData = async () => {
    try {
      const [listsData, settings] = await Promise.all([
        loadLists(),
        loadNotificationSettings(),
      ]);
      setLists(listsData);
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser les notifications dans les paramètres de votre téléphone.'
        );
        return;
      }
    }
    
    const newSettings = { ...notificationSettings, enabled: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    const newSettings = { ...notificationSettings, dailyReminder: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      Alert.alert('Notification envoyée', 'Vous devriez recevoir une notification dans quelques secondes.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la notification de test.');
    }
  };

  const handleChangeDaysBeforeExpiration = async (days: number) => {
    const newSettings = { ...notificationSettings, daysBeforeExpiration: days };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  // Fonction pour calculer les jours jusqu'à expiration
  const getDaysUntilExpiration = (dateString: string): number | null => {
    try {
      const [day, month, year] = dateString.split('/').map(Number);
      const expiration = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      
      const diffTime = expiration.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch {
      return null;
    }
  };

  // Calculer les statistiques
  const allItems: FoodItem[] = lists.flatMap((list) => list.items);
  
  const totalItems = allItems.length;
  const activeItems = allItems.filter((item) => !item.status || item.status === 'active').length;
  const consumedItems = allItems.filter((item) => item.status === 'consumed').length;
  const thrownItems = allItems.filter((item) => item.status === 'thrown').length;
  const openedItems = allItems.filter((item) => item.isOpened).length;
  
  const expiringSoonItems = allItems.filter((item) => {
    if (item.status !== 'active' && item.status !== undefined) return false;
    const days = getDaysUntilExpiration(item.expirationDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const expiredItems = allItems.filter((item) => {
    if (item.status !== 'active' && item.status !== undefined) return false;
    const days = getDaysUntilExpiration(item.expirationDate);
    return days !== null && days < 0;
  }).length;

  const totalLists = lists.length;

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = '#3C6E47' 
  }: { 
    title: string; 
    value: number; 
    icon: string;
    color?: string;
  }) => (
    <View className="bg-[#A3C9A8] rounded-2xl p-4 border border-[#3C6E47] mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[#3C6E47] text-sm font-medium mb-1">
            {title}
          </Text>
          <Text className="text-[#3C6E47] text-3xl font-bold">
            {value}
          </Text>
        </View>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
    </View>
  );

  const SettingRow = ({
    icon,
    title,
    subtitle,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    rightElement: React.ReactNode;
  }) => (
    <View className="flex-row items-center py-4 border-b border-[#3C6E47]/10">
      <View className="w-10 h-10 rounded-xl bg-[#A3C9A8]/50 items-center justify-center mr-4">
        <Ionicons name={icon as any} size={20} color="#3C6E47" />
      </View>
      <View className="flex-1">
        <Text className="text-[#3C6E47] font-semibold text-base">{title}</Text>
        {subtitle && (
          <Text className="text-[#6A8A6E] text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F7F5E6]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-16 pb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold text-[#3C6E47]">
          Mon Compte
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Notifications */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            🔔 Notifications
          </Text>
          
          <View className="bg-white rounded-2xl p-4 border border-[#3C6E47]/20">
            <SettingRow
              icon="notifications-outline"
              title="Activer les notifications"
              subtitle="Recevoir des alertes d'expiration"
              rightElement={
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: '#D1D5DB', true: '#A3C9A8' }}
                  thumbColor={notificationSettings.enabled ? '#3C6E47' : '#9CA3AF'}
                />
              }
            />

            {notificationSettings.enabled && (
              <>
                <SettingRow
                  icon="time-outline"
                  title="Rappel quotidien"
                  subtitle="Notification chaque matin à 9h"
                  rightElement={
                    <Switch
                      value={notificationSettings.dailyReminder}
                      onValueChange={handleToggleDailyReminder}
                      trackColor={{ false: '#D1D5DB', true: '#A3C9A8' }}
                      thumbColor={notificationSettings.dailyReminder ? '#3C6E47' : '#9CA3AF'}
                    />
                  }
                />

                <View className="py-4 border-b border-[#3C6E47]/10">
                  <View className="flex-row items-center mb-3">
                    <View className="w-10 h-10 rounded-xl bg-[#A3C9A8]/50 items-center justify-center mr-4">
                      <Ionicons name="calendar-outline" size={20} color="#3C6E47" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#3C6E47] font-semibold text-base">
                        Alerter avant expiration
                      </Text>
                      <Text className="text-[#6A8A6E] text-sm mt-0.5">
                        Nombre de jours avant
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-center gap-2 mt-2">
                    {[1, 2, 3, 5, 7].map((days) => (
                      <PressableScale
                        key={days}
                        onPress={() => handleChangeDaysBeforeExpiration(days)}
                        className={`px-4 py-2 rounded-xl ${
                          notificationSettings.daysBeforeExpiration === days
                            ? 'bg-[#3C6E47]'
                            : 'bg-[#A3C9A8]/30'
                        }`}
                        hapticType="light"
                      >
                        <Text
                          className={`font-semibold ${
                            notificationSettings.daysBeforeExpiration === days
                              ? 'text-white'
                              : 'text-[#3C6E47]'
                          }`}
                        >
                          {days}j
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                </View>

                <PressableScale
                  onPress={handleTestNotification}
                  className="flex-row items-center justify-center py-4 mt-2"
                  hapticType="light"
                >
                  <Ionicons name="paper-plane-outline" size={18} color="#3C6E47" />
                  <Text className="text-[#3C6E47] font-medium ml-2">
                    Tester les notifications
                  </Text>
                </PressableScale>
              </>
            )}
          </View>
        </View>

        {/* Statistiques générales */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            📊 Statistiques
          </Text>
          
          <StatCard
            title="Total d'aliments"
            value={totalItems}
            icon="basket-outline"
          />
          
          <StatCard
            title="Aliments actifs"
            value={activeItems}
            icon="checkmark-circle-outline"
            color="#3C6E47"
          />
          
          <StatCard
            title="Bientôt périmés"
            value={expiringSoonItems}
            icon="warning-outline"
            color="#f59e0b"
          />
          
          <StatCard
            title="Expirés"
            value={expiredItems}
            icon="alert-circle-outline"
            color="#ef4444"
          />
        </View>

        {/* Statistiques d'utilisation */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            📈 Utilisation
          </Text>
          
          <StatCard
            title="Consommés"
            value={consumedItems}
            icon="restaurant-outline"
            color="#3C6E47"
          />
          
          <StatCard
            title="Jetés"
            value={thrownItems}
            icon="trash-outline"
            color="#6b7280"
          />
          
          <StatCard
            title="Produits ouverts"
            value={openedItems}
            icon="open-outline"
            color="#3C6E47"
          />
          
          <StatCard
            title="Nombre de listes"
            value={totalLists}
            icon="list-outline"
          />
        </View>

        {/* Section Aide & Support */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            💬 Aide & Support
          </Text>
          
          <TouchableOpacity
            onPress={() => setFeedbackModalVisible(true)}
            className="bg-[#A3C9A8] rounded-2xl p-4 border border-[#3C6E47] flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="mail-outline" size={24} color="#3C6E47" />
              <Text className="text-[#3C6E47] font-semibold text-base ml-3">
                Envoyer un feedback
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3C6E47" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de feedback */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </View>
  );
}
