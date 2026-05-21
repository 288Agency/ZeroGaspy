import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import FeedbackModal from '../components/FeedbackModal';
import AccountSettingsModal from '../components/AccountSettingsModal';
import LegalModal from '../components/LegalModal';
import AchievementsModal from '../components/AchievementsModal';
import { PaywallSheet, DeferredAuthSheet } from '../components/ds';
import { usePaywallSheetProps } from '../hooks/usePaywallSheetProps';
import PressableScale from '../components/PressableScale';
import LanguageSelector, { LanguageButton } from '../components/LanguageSelector';
import { useGamification } from '../contexts/GamificationContext';
import { getLevelTitle } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getPendingChangesCount, syncWithCloud } from '../services/supabase/syncService';
import { useIsOnline } from '../hooks/useOnlineStatus';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  NotificationSettings,
} from '../services/notificationService';
import {
  exportAndShareJSON,
  exportAndShareCSV,
  getExportStats,
  cleanupOldExports,
} from '../services/exportService';
import { syncNotificationPrefsToCloud } from '../services/notificationPreferencesSync';
import * as StoreReview from 'expo-store-review';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleFontSize } from '../utils/responsive';
import { getReferralInfo, shareReferralLink, ReferralInfo } from '../services/referralService';
import { trackReferralCodeShared } from '../services/analytics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const { t } = useTranslation();
  const paywallProps = usePaywallSheetProps();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, isLocalMode, signInWithApple } = useAuth();
  const { isPremium, currentPlan, expirationDate, restorePurchases, refreshSubscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const isOnline = useIsOnline();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [accountSettingsVisible, setAccountSettingsVisible] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const { gamificationData, refreshData: refreshGamification } = useGamification();
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
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [settings, stats] = await Promise.all([
        loadNotificationSettings(),
        getExportStats(),
        refreshGamification(),
        refreshSubscriptionStatus(),
      ]);
      setNotificationSettings(settings);
      setExportStats(stats);

      if (user?.id) {
        const pending = await getPendingChangesCount(user.id);
        setPendingChanges(pending);

        const refInfo = await getReferralInfo(user.id);
        setReferralInfo(refInfo);
      }
    } catch (error) {
      logger.error('Erreur lors du chargement:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('account.logout'),
      t('account.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.logoutAction'),
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
      Alert.alert(t('common.syncTitle'), t('account.syncSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('account.syncError'));
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
          t('account.permissionRequired'),
          t('account.permissionText')
        );
        return;
      }
    }

    const newSettings = { ...notificationSettings, enabled: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    if (user?.id) {
      syncNotificationPrefsToCloud(user.id, newSettings);
    }
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    const newSettings = { ...notificationSettings, dailyReminder: value };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    if (user?.id) {
      syncNotificationPrefsToCloud(user.id, newSettings);
    }
  };

  const handleChangeDaysBeforeExpiration = async (days: number) => {
    const newSettings = { ...notificationSettings, daysBeforeExpiration: days };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
    if (user?.id) {
      syncNotificationPrefsToCloud(user.id, newSettings);
    }
  };

  const handleExportJSON = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportAndShareJSON();
      Alert.alert(t('export.success'), t('export.jsonSuccess'));
      // Nettoyer les anciens exports
      await cleanupOldExports();
    } catch (error) {
      Alert.alert(t('common.error'), t('export.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportAndShareCSV();
      Alert.alert(t('export.success'), t('export.csvSuccess'));
      // Nettoyer les anciens exports
      await cleanupOldExports();
    } catch (error) {
      Alert.alert(t('common.error'), t('export.exportError'));
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
    <View style={styles.settingRow}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon as any} size={20} color={COLORS.primary[500]} />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </View>
  );

  const headerPaddingTop = Math.max(insets.top, SPACING.lg) + SPACING.sm;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <Text style={styles.headerTitle}>
          {t('account.title')}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
            colors={[COLORS.primary[500]]}
          />
        }
      >
        {/* Section Compte Utilisateur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionAccount')}
          </Text>

          <View style={styles.sectionCard}>
            {user ? (
              <>
                {/* Utilisateur connecte */}
                <View style={styles.userRow}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.user_metadata?.full_name || t('account.user')}
                    </Text>
                    <Text style={styles.userEmail}>
                      {user.email}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
                    <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                      {isOnline ? t('account.online') : t('account.offline')}
                    </Text>
                  </View>
                </View>

                {/* Statut de synchronisation */}
                <View style={styles.syncStatusContainer}>
                  <View style={styles.syncStatusRow}>
                    <View style={styles.syncStatusLeft}>
                      <Ionicons
                        name={pendingChanges > 0 ? "cloud-upload-outline" : "cloud-done-outline"}
                        size={20}
                        color={COLORS.primary[500]}
                      />
                      <Text style={styles.syncStatusText}>
                        {pendingChanges > 0
                          ? t('account.pendingChanges', { count: pendingChanges })
                          : t('account.synced')}
                      </Text>
                    </View>
                    {pendingChanges > 0 && isOnline && (
                      <PressableScale
                        onPress={handleManualSync}
                        style={styles.syncButton}
                        hapticType="light"
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <ActivityIndicator size="small" color={COLORS.neutral.white} />
                        ) : (
                          <Text style={styles.syncButtonText}>{t('account.sync')}</Text>
                        )}
                      </PressableScale>
                    )}
                  </View>
                </View>

                {/* Bouton parametres du compte */}
                <PressableScale
                  onPress={() => setAccountSettingsVisible(true)}
                  style={styles.accountSettingsButton}
                  hapticType="light"
                >
                  <View style={styles.accountSettingsLeft}>
                    <Ionicons name="settings-outline" size={20} color={COLORS.primary[500]} />
                    <Text style={styles.accountSettingsText}>
                      {t('account.accountSettings')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
                </PressableScale>

                {/* Bouton deconnexion */}
                <PressableScale
                  onPress={handleLogout}
                  style={styles.logoutButton}
                  hapticType="medium"
                >
                  <Ionicons name="log-out-outline" size={20} color={COLORS.semantic.danger} />
                  <Text style={styles.logoutText}>
                    {t('account.logoutAction')}
                  </Text>
                </PressableScale>
              </>
            ) : isLocalMode ? (
              <>
                {/* Mode local */}
                <View style={styles.userRow}>
                  <View style={styles.localAvatar}>
                    <Ionicons name="phone-portrait-outline" size={24} color={COLORS.primary[500]} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {t('account.localMode')}
                    </Text>
                    <Text style={styles.userEmail}>
                      {t('account.localModeDesc')}
                    </Text>
                  </View>
                </View>

                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={20} color={COLORS.semantic.warningDark} />
                  <Text style={styles.warningBannerText}>
                    {t('account.createAccountWarning')}
                  </Text>
                </View>

                <PressableScale
                  onPress={() => setAuthSheetVisible(true)}
                  style={styles.createAccountButton}
                  hapticType="medium"
                >
                  <Ionicons name="person-add-outline" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.createAccountText}>
                    {t('account.createAccount')}
                  </Text>
                </PressableScale>
              </>
            ) : null}
          </View>
        </View>

        {/* Section Mes Succes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionAchievements')}
          </Text>

          <PressableScale
            onPress={() => setAchievementsVisible(true)}
            style={styles.achievementsCard}
            hapticType="light"
          >
            <View style={styles.achievementsRow}>
              <View style={styles.achievementsLeft}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelText}>
                    {gamificationData?.level || 1}
                  </Text>
                </View>
                <View style={styles.achievementsInfo}>
                  <Text style={styles.levelTitle}>
                    {getLevelTitle(gamificationData?.level || 1)}
                  </Text>
                  <Text style={styles.xpText}>
                    {gamificationData?.totalXp || 0} XP
                  </Text>
                  <View style={styles.streaksRow}>
                    <Text style={styles.streakText}>
                      🔥 {gamificationData?.streaks.currentDaily || 0}{t('common.dayShort')}
                    </Text>
                    <Text style={styles.streakText}>
                      🌱 {gamificationData?.streaks.currentNoWaste || 0}{t('common.dayShort')}
                    </Text>
                    <Text style={styles.streakText}>
                      🛡️ {gamificationData?.streakFreezes?.available ?? 0}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.achievementsRight}>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </View>
            </View>

            {/* Barre XP */}
            <View style={styles.xpBarContainer}>
              <View style={styles.xpBarBackground}>
                <View
                  style={[
                    styles.xpBarFill,
                    {
                      width: `${gamificationData ? (gamificationData.xp / gamificationData.xpToNextLevel) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.xpBarLabel}>
                {gamificationData?.xp || 0} / {gamificationData?.xpToNextLevel || 100} XP
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* Section Parrainage */}
        {user && referralInfo?.code && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('account.sectionReferral')}
            </Text>

            <View style={styles.sectionCard}>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeLabel}>{t('referral.yourCode')}</Text>
                <Text style={styles.referralCodeValue}>{referralInfo.code}</Text>
              </View>

              <View style={styles.referralStatsRow}>
                <View style={styles.referralStatItem}>
                  <Text style={styles.referralStatValue}>{referralInfo.referralCount}/5</Text>
                  <Text style={styles.referralStatLabel}>{t('referral.referrals')}</Text>
                </View>
                <View style={styles.referralStatDivider} />
                <View style={styles.referralStatItem}>
                  <Text style={styles.referralStatValue}>{referralInfo.bonusScansRemaining}</Text>
                  <Text style={styles.referralStatLabel}>{t('referral.bonusScans')}</Text>
                </View>
              </View>

              <Text style={styles.referralDescription}>{t('referral.description')}</Text>

              <PressableScale
                onPress={async () => {
                  if (referralInfo.code) {
                    const shared = await shareReferralLink(referralInfo.code);
                    if (shared) trackReferralCodeShared();
                  }
                }}
                style={styles.referralShareButton}
                hapticType="medium"
              >
                <Ionicons name="share-outline" size={20} color={COLORS.neutral.white} />
                <Text style={styles.referralShareText}>{t('referral.inviteFriend')}</Text>
              </PressableScale>
            </View>
          </View>
        )}

        {/* Section Abonnement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionSubscription')}
          </Text>

          <View style={styles.sectionCard}>
            {isPremium ? (
              <>
                {/* Utilisateur Premium */}
                <View style={styles.userRow}>
                  <View style={styles.premiumAvatar}>
                    <Ionicons name="star" size={28} color={COLORS.neutral.white} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {t('account.premium.title')} {currentPlan === 'yearly' ? t('account.premium.yearly') : t('account.premium.monthly')}
                    </Text>
                    {expirationDate && (
                      <Text style={styles.userEmail}>
                        {t('account.premium.validUntil')} {expirationDate.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{t('account.premium.active')}</Text>
                  </View>
                </View>

                <View style={styles.premiumInfoBox}>
                  <Text style={styles.premiumInfoText}>
                    {t('account.premiumInfo')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Utilisateur Gratuit */}
                <View style={styles.userRow}>
                  <View style={styles.freeAvatar}>
                    <Ionicons name="person-outline" size={28} color={COLORS.primary[500]} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {t('account.freeVersion')}
                    </Text>
                    <Text style={styles.userEmail}>
                      {t('account.maxLists')}
                    </Text>
                  </View>
                </View>

                <PressableScale
                  onPress={() => setPaywallVisible(true)}
                  style={styles.upgradePremiumButton}
                  hapticType="medium"
                >
                  <Ionicons name="star" size={20} color={COLORS.neutral.white} />
                  <Text style={styles.upgradePremiumText}>
                    {t('account.premium.upgrade')}
                  </Text>
                </PressableScale>

                <TouchableOpacity
                  onPress={restorePurchases}
                  disabled={subscriptionLoading}
                  style={styles.restorePurchasesButton}
                >
                  {subscriptionLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary[500]} />
                  ) : (
                    <Text style={styles.restorePurchasesText}>
                      {t('account.premium.restore')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Section Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionNotifications')}
          </Text>

          <View style={styles.sectionCard}>
            <SettingRow
              icon="notifications-outline"
              title={t('notifications.enable')}
              subtitle={t('notifications.enableDesc')}
              rightElement={
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: COLORS.neutral.grayBorder, true: COLORS.secondary.sage }}
                  thumbColor={notificationSettings.enabled ? COLORS.primary[500] : COLORS.neutral.grayDisabled}
                />
              }
            />

            {notificationSettings.enabled && (
              <>
                <SettingRow
                  icon="time-outline"
                  title={t('notifications.dailyReminder')}
                  subtitle={t('notifications.dailyReminderDesc')}
                  rightElement={
                    <Switch
                      value={notificationSettings.dailyReminder}
                      onValueChange={handleToggleDailyReminder}
                      trackColor={{ false: COLORS.neutral.grayBorder, true: COLORS.secondary.sage }}
                      thumbColor={notificationSettings.dailyReminder ? COLORS.primary[500] : COLORS.neutral.grayDisabled}
                    />
                  }
                />

                <View style={styles.expirationAlertContainer}>
                  <View style={styles.expirationAlertHeader}>
                    <View style={styles.settingIconContainer}>
                      <Ionicons name="calendar-outline" size={20} color={COLORS.primary[500]} />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>
                        {t('notifications.daysBeforeExpiration')}
                      </Text>
                      <Text style={styles.settingSubtitle}>
                        {t('notifications.daysBeforeExpirationDesc')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.daysButtonRow}>
                    {[1, 2, 3, 5, 7].map((days) => (
                      <PressableScale
                        key={days}
                        onPress={() => handleChangeDaysBeforeExpiration(days)}
                        style={[
                          styles.dayButton,
                          notificationSettings.daysBeforeExpiration === days
                            ? styles.dayButtonActive
                            : styles.dayButtonInactive,
                        ]}
                        hapticType="light"
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            notificationSettings.daysBeforeExpiration === days
                              ? styles.dayButtonTextActive
                              : styles.dayButtonTextInactive,
                          ]}
                        >
                          {days}{t('common.dayShort')}
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                </View>

              </>
            )}
          </View>
        </View>

        {/* Section Export des données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionExport')}
          </Text>

          {exportStats && (
            <View style={[styles.sectionCard, { marginBottom: SPACING.md }]}>
              <View style={styles.exportStatRow}>
                <Text style={styles.exportStatLabel}>{t('export.lists')}</Text>
                <Text style={styles.exportStatValue}>{exportStats.totalLists}</Text>
              </View>
              <View style={styles.exportStatRow}>
                <Text style={styles.exportStatLabel}>{t('export.items')}</Text>
                <Text style={styles.exportStatValue}>{exportStats.totalItems}</Text>
              </View>
              <View style={styles.exportStatRowLast}>
                <Text style={styles.exportStatLabel}>{t('export.estimatedSize')}</Text>
                <Text style={styles.exportStatValue}>{exportStats.estimatedSize}</Text>
              </View>
            </View>
          )}

          <View style={styles.exportButtonsRow}>
            <TouchableOpacity
              onPress={handleExportJSON}
              style={styles.exportJsonButton}
              activeOpacity={0.7}
              disabled={isExporting}
            >
              <View style={styles.exportButtonContent}>
                <Ionicons
                  name="code-download-outline"
                  size={28}
                  color={isExporting ? COLORS.secondary.sage : COLORS.neutral.white}
                />
                <Text style={[styles.exportButtonTitle, isExporting ? styles.exportButtonTitleDisabled : styles.exportButtonTitleWhite]}>
                  {t('export.json')}
                </Text>
                <Text style={[styles.exportButtonSubtitle, isExporting ? styles.exportButtonSubtitleDisabled : styles.exportButtonSubtitleWhite]}>
                  {t('export.jsonDesc')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCSV}
              style={styles.exportCsvButton}
              activeOpacity={0.7}
              disabled={isExporting}
            >
              <View style={styles.exportButtonContent}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={isExporting ? COLORS.secondary.sage : COLORS.primary[500]}
                />
                <Text style={[styles.exportButtonTitle, isExporting ? styles.exportButtonTitleDisabled : styles.exportButtonTitleGreen]}>
                  {t('export.csv')}
                </Text>
                <Text style={styles.exportCsvSubtitle}>
                  {t('export.csvDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.exportInfoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.semantic.warningDark} />
            <Text style={styles.exportInfoText}>
              {t('export.privacyInfo')}
            </Text>
          </View>
        </View>

        {/* Section Langue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionLanguage')}
          </Text>
          <LanguageButton onPress={() => setLanguageModalVisible(true)} />
        </View>

        {/* Section Aide & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionSupport')}
          </Text>

          <TouchableOpacity
            onPress={() => setFeedbackModalVisible(true)}
            style={styles.feedbackButton}
            activeOpacity={0.7}
          >
            <View style={styles.supportButtonLeft}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary[500]} />
              <Text style={styles.supportButtonText}>
                {t('support.feedback')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary[500]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
              }
            }}
            style={styles.rateButton}
            activeOpacity={0.7}
          >
            <View style={styles.supportButtonLeft}>
              <Ionicons name="star-outline" size={24} color={COLORS.accent.gold} />
              <Text style={styles.rateButtonText}>
                {t('support.rateApp')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.accent.gold} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setLegalModalVisible(true)}
            style={styles.legalButton}
            activeOpacity={0.7}
          >
            <View style={styles.supportButtonLeft}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary[500]} />
              <Text style={styles.legalButtonText}>
                {t('support.legal')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Section Réseaux Sociaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionSocial')}
          </Text>

          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.instagram.com/zerogaspyapp/')}
              style={styles.socialButton}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-instagram" size={28} color="#E1306C" />
              <Text style={styles.socialButtonText}>Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://x.com/zerogaspy')}
              style={styles.socialButton}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-twitter" size={28} color={COLORS.primary[500]} />
              <Text style={styles.socialButtonText}>X (Twitter)</Text>
            </TouchableOpacity>
          </View>
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
      <PaywallSheet
        {...paywallProps}
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="addList"
      />

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Deferred auth sheet — backup local data to cloud */}
      <DeferredAuthSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
        reason="backup"
        onAppleSignIn={async () => {
          const { error } = await signInWithApple();
          if (!error) {
            setAuthSheetVisible(false);
          }
        }}
        onEmailSignUp={() => {
          setAuthSheetVisible(false);
          navigation.navigate('Register');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['2xl'],
  },
  headerTitle: {
    fontSize: scaleFontSize(26),
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },

  // User row (shared across sections)
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  userAvatarText: {
    color: COLORS.neutral.white,
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  userEmail: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },

  // Online/Offline status
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusOnline: {
    backgroundColor: COLORS.secondary.sage,
  },
  statusOffline: {
    backgroundColor: COLORS.surface.warningLightBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextOnline: {
    color: COLORS.primary[500],
  },
  statusTextOffline: {
    color: COLORS.text.warningDark,
  },

  // Sync status
  syncStatusContainer: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatusText: {
    color: COLORS.primary[500],
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.lg,
  },
  syncButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '500',
  },

  // Account settings button
  accountSettingsButton: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  accountSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountSettingsText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // Logout button
  logoutButton: {
    backgroundColor: COLORS.surface.dangerBgLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: COLORS.semantic.danger,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // Local mode
  localAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },

  // Warning banner
  warningBanner: {
    backgroundColor: COLORS.surface.warningBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningBannerText: {
    color: COLORS.semantic.warningDark,
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Create account button
  createAccountButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // Achievements card
  achievementsCard: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  achievementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  levelText: {
    color: COLORS.neutral.white,
    fontSize: 20,
    fontWeight: '700',
  },
  achievementsInfo: {
    flex: 1,
  },
  levelTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  xpText: {
    color: COLORS.neutral.white,
    fontWeight: '700',
    fontSize: 18,
  },
  streaksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  streakText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginRight: SPACING.sm,
  },
  achievementsRight: {
    alignItems: 'flex-end',
  },

  // XP bar
  xpBarContainer: {
    marginTop: SPACING.md,
  },
  xpBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS.full,
  },
  xpBarLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  // Premium section
  premiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  premiumBadge: {
    backgroundColor: hexToRgba(COLORS.accent.gold, 0.2),
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  premiumBadgeText: {
    color: COLORS.accent.amber,
    fontSize: 12,
    fontWeight: '600',
  },
  premiumInfoBox: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  premiumInfoText: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },

  // Free user
  freeAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  upgradePremiumButton: {
    backgroundColor: COLORS.accent.gold,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  upgradePremiumText: {
    color: COLORS.neutral.white,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  restorePurchasesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  restorePurchasesText: {
    color: COLORS.primary[500],
    fontWeight: '500',
  },

  // Notification settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    color: COLORS.text.primary,
    fontWeight: '700',
    fontSize: scaleFontSize(16),
  },
  settingSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    marginTop: 2,
  },

  // Expiration alert
  expirationAlertContainer: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  expirationAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  daysButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  dayButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primary[500],
  },
  dayButtonInactive: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
  },
  dayButtonText: {
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: COLORS.neutral.white,
  },
  dayButtonTextInactive: {
    color: COLORS.primary[500],
  },


  // Export section
  exportStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  exportStatRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportStatLabel: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  exportStatValue: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  exportJsonButton: {
    flex: 1,
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  exportCsvButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
  },
  exportButtonContent: {
    alignItems: 'center',
  },
  exportButtonTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  exportButtonTitleWhite: {
    color: COLORS.neutral.white,
  },
  exportButtonTitleGreen: {
    color: COLORS.primary[500],
  },
  exportButtonTitleDisabled: {
    color: COLORS.secondary.sage,
  },
  exportButtonSubtitle: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  exportButtonSubtitleWhite: {
    color: COLORS.neutral.white,
    opacity: 0.8,
  },
  exportButtonSubtitleDisabled: {
    color: COLORS.secondary.sage,
    opacity: 0.8,
  },
  exportCsvSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    marginTop: SPACING.xs,
  },

  // Export info banner
  exportInfoBanner: {
    backgroundColor: COLORS.surface.warningBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exportInfoText: {
    color: COLORS.semantic.warningDark,
    fontSize: 12,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Support section
  feedbackButton: {
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  rateButton: {
    backgroundColor: COLORS.surface.infoBg,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.accent.gold, 0.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  legalButton: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supportButtonText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
    marginLeft: SPACING.md,
  },
  rateButtonText: {
    color: COLORS.accent.amber,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: SPACING.md,
  },
  legalButtonText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
    marginLeft: SPACING.md,
  },

  // Social media section
  socialRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  socialButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  socialButtonText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 14,
  },

  // Referral section
  referralCodeBox: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    borderStyle: 'dashed',
  },
  referralCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  referralCodeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary[500],
    letterSpacing: 2,
  },
  referralStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  referralStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  referralStatLabel: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  referralStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.15),
  },
  referralDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  referralShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  referralShareText: {
    color: COLORS.neutral.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
