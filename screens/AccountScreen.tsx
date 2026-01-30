import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import FeedbackModal from '../components/FeedbackModal';
import AccountSettingsModal from '../components/AccountSettingsModal';
import LegalModal from '../components/LegalModal';
import AchievementsModal from '../components/AchievementsModal';
import PaywallModal from '../components/PaywallModal';
import PressableScale from '../components/PressableScale';
import { useGamification } from '../contexts/GamificationContext';
import { getLevelTitle } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPendingChangesCount, syncWithCloud } from '../services/supabase/syncService';
import { useIsOnline } from '../hooks/useOnlineStatus';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
  requestNotificationPermissions,
  NotificationSettings,
} from '../services/notificationService';
import {
  exportAndShareJSON,
  exportAndShareCSV,
  getExportStats,
  cleanupOldExports,
} from '../services/exportService';
import * as StoreReview from 'expo-store-review';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, isLocalMode } = useAuth();
  const { isPremium, currentPlan, expirationDate, restorePurchases, isLoading: subscriptionLoading } = useSubscription();
  const isOnline = useIsOnline();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [accountSettingsVisible, setAccountSettingsVisible] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { gamificationData } = useGamification();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    dailyReminder: true,
    dailyReminderTime: '09:00',
    daysBeforeExpiration: 3,
  });
  const [exportStats, setExportStats] = useState<{
    totalLists: number;
    totalItems: number;
    estimatedSize: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
    try {
      const [settings, stats] = await Promise.all([
        loadNotificationSettings(),
        getExportStats(),
      ]);
      setNotificationSettings(settings);
      setExportStats(stats);

      // Charger le nombre de changements en attente
      if (user?.id) {
        const pending = await getPendingChangesCount(user.id);
        setPendingChanges(pending);
      }
    } catch (error) {
      logger.error('Erreur lors du chargement:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Deconnexion',
      'Etes-vous sur de vouloir vous deconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Deconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!user?.id || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncWithCloud(user.id);
      const pending = await getPendingChangesCount(user.id);
      setPendingChanges(pending);
      Alert.alert('Synchronisation', 'Vos donnees ont ete synchronisees avec succes !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser. Verifiez votre connexion.');
    } finally {
      setIsSyncing(false);
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

  const handleExportJSON = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportAndShareJSON();
      Alert.alert('Export réussi', 'Vos données ont été exportées au format JSON.');
      // Nettoyer les anciens exports
      await cleanupOldExports();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter vos données. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportAndShareCSV();
      Alert.alert('Export réussi', 'Vos données ont été exportées au format CSV (compatible Excel).');
      // Nettoyer les anciens exports
      await cleanupOldExports();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter vos données. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

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
      <View className="flex-row items-center justify-center px-5 pt-16 pb-6">
        <Text className="text-2xl font-semibold text-[#3C6E47]">
          Mon Compte
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Compte Utilisateur */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            👤 Compte
          </Text>

          <View className="bg-white rounded-2xl p-4 border border-[#3C6E47]/20">
            {user ? (
              <>
                {/* Utilisateur connecte */}
                <View className="flex-row items-center mb-4">
                  <View className="w-14 h-14 rounded-full bg-[#3C6E47] items-center justify-center mr-4">
                    <Text className="text-white text-xl font-bold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#3C6E47] font-bold text-lg">
                      {user.user_metadata?.full_name || 'Utilisateur'}
                    </Text>
                    <Text className="text-[#6A8A6E] text-sm">
                      {user.email}
                    </Text>
                  </View>
                  <View className={`px-2 py-1 rounded-full ${isOnline ? 'bg-[#A3C9A8]' : 'bg-yellow-100'}`}>
                    <Text className={`text-xs font-medium ${isOnline ? 'text-[#3C6E47]' : 'text-yellow-700'}`}>
                      {isOnline ? 'En ligne' : 'Hors ligne'}
                    </Text>
                  </View>
                </View>

                {/* Statut de synchronisation */}
                <View className="bg-[#F7F5E6] rounded-xl p-3 mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={pendingChanges > 0 ? "cloud-upload-outline" : "cloud-done-outline"}
                        size={20}
                        color="#3C6E47"
                      />
                      <Text className="text-[#3C6E47] ml-2 font-medium">
                        {pendingChanges > 0
                          ? `${pendingChanges} modification(s) en attente`
                          : 'Tout est synchronise'}
                      </Text>
                    </View>
                    {pendingChanges > 0 && isOnline && (
                      <PressableScale
                        onPress={handleManualSync}
                        className="bg-[#3C6E47] px-3 py-1.5 rounded-lg"
                        hapticType="light"
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className="text-white text-sm font-medium">Sync</Text>
                        )}
                      </PressableScale>
                    )}
                  </View>
                </View>

                {/* Bouton parametres du compte */}
                <PressableScale
                  onPress={() => setAccountSettingsVisible(true)}
                  className="bg-[#F7F5E6] rounded-xl p-4 flex-row items-center justify-between mb-3"
                  hapticType="light"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="settings-outline" size={20} color="#3C6E47" />
                    <Text className="text-[#3C6E47] font-semibold ml-2">
                      Parametres du compte
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
                </PressableScale>

                {/* Bouton deconnexion */}
                <PressableScale
                  onPress={handleLogout}
                  className="bg-red-50 rounded-xl p-4 flex-row items-center justify-center"
                  hapticType="medium"
                >
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  <Text className="text-red-500 font-semibold ml-2">
                    Se deconnecter
                  </Text>
                </PressableScale>
              </>
            ) : isLocalMode ? (
              <>
                {/* Mode local */}
                <View className="flex-row items-center mb-4">
                  <View className="w-14 h-14 rounded-full bg-[#A3C9A8] items-center justify-center mr-4">
                    <Ionicons name="phone-portrait-outline" size={24} color="#3C6E47" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#3C6E47] font-bold text-lg">
                      Mode local
                    </Text>
                    <Text className="text-[#6A8A6E] text-sm">
                      Donnees stockees sur cet appareil
                    </Text>
                  </View>
                </View>

                <View className="bg-[#FFF3E0] rounded-xl p-3 mb-4 flex-row items-start">
                  <Ionicons name="warning-outline" size={20} color="#E85D04" />
                  <Text className="text-[#E85D04] text-sm ml-2 flex-1">
                    Creez un compte pour sauvegarder vos donnees dans le cloud et y acceder depuis n'importe quel appareil.
                  </Text>
                </View>

                <PressableScale
                  onPress={() => signOut()}
                  className="bg-[#3C6E47] rounded-xl p-4 flex-row items-center justify-center"
                  hapticType="medium"
                >
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text className="text-white font-semibold ml-2">
                    Creer un compte
                  </Text>
                </PressableScale>
              </>
            ) : null}
          </View>
        </View>

        {/* Section Mes Succes */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            🏆 Mes Succes
          </Text>

          <PressableScale
            onPress={() => setAchievementsVisible(true)}
            className="bg-gradient-to-r from-[#3C6E47] to-[#4A8A5C] bg-[#3C6E47] rounded-2xl p-4 border border-[#3C6E47]"
            hapticType="light"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-4">
                  <Text className="text-white text-xl font-bold">
                    {gamificationData?.level || 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white/80 text-sm">
                    {getLevelTitle(gamificationData?.level || 1)}
                  </Text>
                  <Text className="text-white font-bold text-lg">
                    {gamificationData?.totalXp || 0} XP
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/70 text-xs mr-2">
                      🔥 {gamificationData?.streaks.currentDaily || 0}j
                    </Text>
                    <Text className="text-white/70 text-xs">
                      🌱 {gamificationData?.streaks.currentNoWaste || 0}j
                    </Text>
                  </View>
                </View>
              </View>
              <View className="items-end">
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </View>

            {/* Barre XP */}
            <View className="mt-3">
              <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#A3C9A8] rounded-full"
                  style={{
                    width: `${gamificationData ? (gamificationData.xp / gamificationData.xpToNextLevel) * 100 : 0}%`
                  }}
                />
              </View>
              <Text className="text-white/60 text-xs text-right mt-1">
                {gamificationData?.xp || 0} / {gamificationData?.xpToNextLevel || 100} XP
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* Section Abonnement */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            ⭐ Mon Abonnement
          </Text>

          <View className="bg-white rounded-2xl p-4 border border-[#3C6E47]/20">
            {isPremium ? (
              <>
                {/* Utilisateur Premium */}
                <View className="flex-row items-center mb-4">
                  <View className="w-14 h-14 rounded-full bg-[#F59E0B] items-center justify-center mr-4">
                    <Ionicons name="star" size={28} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#3C6E47] font-bold text-lg">
                      Premium {currentPlan === 'yearly' ? 'Annuel' : 'Mensuel'}
                    </Text>
                    {expirationDate && (
                      <Text className="text-[#6A8A6E] text-sm">
                        Valide jusqu'au {expirationDate.toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                  </View>
                  <View className="bg-[#F59E0B]/20 px-3 py-1 rounded-full">
                    <Text className="text-[#B45309] text-xs font-semibold">Actif</Text>
                  </View>
                </View>

                <View className="bg-[#F7F5E6] rounded-xl p-3">
                  <Text className="text-[#6A8A6E] text-sm">
                    Vous profitez de toutes les fonctionnalites Premium : listes illimitees, scanner de tickets et aucune publicite.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Utilisateur Gratuit */}
                <View className="flex-row items-center mb-4">
                  <View className="w-14 h-14 rounded-full bg-[#A3C9A8]/50 items-center justify-center mr-4">
                    <Ionicons name="person-outline" size={28} color="#3C6E47" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#3C6E47] font-bold text-lg">
                      Version Gratuite
                    </Text>
                    <Text className="text-[#6A8A6E] text-sm">
                      3 listes maximum
                    </Text>
                  </View>
                </View>

                <PressableScale
                  onPress={() => setPaywallVisible(true)}
                  className="bg-[#F59E0B] rounded-xl p-4 flex-row items-center justify-center mb-3"
                  hapticType="medium"
                >
                  <Ionicons name="star" size={20} color="#fff" />
                  <Text className="text-white font-bold ml-2">
                    Passer Premium
                  </Text>
                </PressableScale>

                <TouchableOpacity
                  onPress={restorePurchases}
                  disabled={subscriptionLoading}
                  className="flex-row items-center justify-center py-2"
                >
                  {subscriptionLoading ? (
                    <ActivityIndicator size="small" color="#3C6E47" />
                  ) : (
                    <Text className="text-[#3C6E47] font-medium">
                      Restaurer mes achats
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

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

        {/* Section Export des données */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            💾 Export des données
          </Text>

          {exportStats && (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-[#3C6E47]/20">
              <View className="flex-row justify-between mb-2">
                <Text className="text-[#6A8A6E] text-sm">Listes</Text>
                <Text className="text-[#3C6E47] font-semibold">{exportStats.totalLists}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-[#6A8A6E] text-sm">Aliments</Text>
                <Text className="text-[#3C6E47] font-semibold">{exportStats.totalItems}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-[#6A8A6E] text-sm">Taille estimée</Text>
                <Text className="text-[#3C6E47] font-semibold">{exportStats.estimatedSize}</Text>
              </View>
            </View>
          )}

          <View className="flex-row gap-3 mb-3">
            <PressableScale
              onPress={handleExportJSON}
              className="flex-1 bg-[#3C6E47] rounded-2xl p-4 border border-[#3C6E47]"
              hapticType="medium"
              disabled={isExporting}
            >
              <View className="items-center">
                <Ionicons
                  name="code-download-outline"
                  size={28}
                  color={isExporting ? "#A3C9A8" : "#FFFFFF"}
                />
                <Text className={`font-semibold text-base mt-2 ${isExporting ? 'text-[#A3C9A8]' : 'text-white'}`}>
                  Export JSON
                </Text>
                <Text className={`text-xs mt-1 ${isExporting ? 'text-[#A3C9A8]' : 'text-white'} opacity-80`}>
                  Format technique
                </Text>
              </View>
            </PressableScale>

            <PressableScale
              onPress={handleExportCSV}
              className="flex-1 bg-white rounded-2xl p-4 border border-[#3C6E47]"
              hapticType="medium"
              disabled={isExporting}
            >
              <View className="items-center">
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={isExporting ? "#A3C9A8" : "#3C6E47"}
                />
                <Text className={`font-semibold text-base mt-2 ${isExporting ? 'text-[#A3C9A8]' : 'text-[#3C6E47]'}`}>
                  Export CSV
                </Text>
                <Text className="text-[#6A8A6E] text-xs mt-1">
                  Excel compatible
                </Text>
              </View>
            </PressableScale>
          </View>

          <View className="bg-[#FFF3E0] rounded-xl p-3 flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#E85D04" />
            <Text className="text-[#E85D04] text-xs ml-2 flex-1">
              Vos données restent privées. L'export crée un fichier sur votre appareil que vous pouvez sauvegarder.
            </Text>
          </View>
        </View>

        {/* Section Aide & Support */}
        <View className="mb-6">
          <Text className="text-xl font-semibold text-[#3C6E47] mb-4">
            💬 Aide & Support
          </Text>

          <TouchableOpacity
            onPress={() => setFeedbackModalVisible(true)}
            className="bg-[#A3C9A8] rounded-2xl p-4 border border-[#3C6E47] flex-row items-center justify-between mb-3"
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

          <TouchableOpacity
            onPress={async () => {
              if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
              }
            }}
            className="bg-[#FFF8E1] rounded-2xl p-4 border border-[#F59E0B]/30 flex-row items-center justify-between mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="star-outline" size={24} color="#F59E0B" />
              <Text className="text-[#B45309] font-semibold text-base ml-3">
                Noter l'application
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLegalModalVisible(true)}
            className="bg-white rounded-2xl p-4 border border-[#3C6E47]/20 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="document-text-outline" size={24} color="#3C6E47" />
              <Text className="text-[#3C6E47] font-semibold text-base ml-3">
                CGU & Confidentialite
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6A8A6E" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de feedback */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />

      {/* Modal des parametres du compte */}
      <AccountSettingsModal
        visible={accountSettingsVisible}
        onClose={() => setAccountSettingsVisible(false)}
      />

      {/* Modal CGU & Confidentialite */}
      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
      />

      {/* Modal Succes */}
      <AchievementsModal
        visible={achievementsVisible}
        onClose={() => setAchievementsVisible(false)}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="general"
      />
    </View>
  );
}
