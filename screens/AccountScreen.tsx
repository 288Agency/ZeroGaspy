// ============================================================================
// ZeroGaspy · screens/AccountScreen.tsx (handoff port — "Profil")
// ============================================================================
// Hub profil & réglages. Iso-features avec tokens DS v2 et topbar handoff.
// Sections : Hero impact · Compte · Succès · Parrainage · Abonnement ·
// Notifications · Export · Langue · Support · Réseaux sociaux.
// ============================================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import * as StoreReview from 'expo-store-review';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage, Cream } from '@/tokens';
import { Badge, PaywallSheet, DeferredAuthSheet } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useIsOnline } from '@/hooks/useOnlineStatus';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import FeedbackModal from '@/components/FeedbackModal';
import AccountSettingsModal from '@/components/AccountSettingsModal';
import LegalModal from '@/components/LegalModal';
import AchievementsModal from '@/components/AchievementsModal';
import LanguageSelector, { LanguageButton } from '@/components/LanguageSelector';
import ProfileImpactHero from '@/components/ProfileImpactHero';
import { getLevelTitle } from '@/services/gamificationService';
import { getPendingChangesCount, syncWithCloud } from '@/services/supabase/syncService';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  NotificationSettings,
} from '@/services/notificationService';
import {
  exportAndShareJSON,
  exportAndShareCSV,
  getExportStats,
  cleanupOldExports,
} from '@/services/exportService';
import { syncNotificationPrefsToCloud } from '@/services/notificationPreferencesSync';
import { getReferralInfo, shareReferralLink, ReferralInfo } from '@/services/referralService';
import { trackReferralCodeShared } from '@/services/analytics';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const paywallProps = usePaywallSheetProps();

  const { user, signOut, isLocalMode, signInWithApple } = useAuth();
  const {
    isPremium,
    currentPlan,
    expirationDate,
    restorePurchases,
    refreshSubscriptionStatus,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const isOnline = useIsOnline();
  const { gamificationData, refreshData: refreshGamification } = useGamification();

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [accountSettingsVisible, setAccountSettingsVisible] = useState(false);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
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

  const loadData = useCallback(async () => {
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
        setPendingChanges(await getPendingChangesCount(user.id));
        setReferralInfo(await getReferralInfo(user.id));
      }
    } catch (err) {
      logger.error('[AccountV2] loadData failed:', err);
    }
  }, [user?.id, refreshGamification, refreshSubscriptionStatus]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }, [loadData]);

  const handleLogout = useCallback(() => {
    Alert.alert(t('account.logout'), t('account.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.logoutAction'),
        style: 'destructive',
        onPress: async () => { await signOut(); },
      },
    ]);
  }, [t, signOut]);

  const handleManualSync = useCallback(async () => {
    if (!user?.id || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncWithCloud(user.id);
      setPendingChanges(await getPendingChangesCount(user.id));
      Alert.alert(t('common.syncTitle'), t('account.syncSuccess'));
    } catch {
      Alert.alert(t('common.error'), t('account.syncError'));
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isSyncing, t]);

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      if (value) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(t('account.permissionRequired'), t('account.permissionText'));
          return;
        }
      }
      const next = { ...notificationSettings, enabled: value };
      setNotificationSettings(next);
      await saveNotificationSettings(next);
      if (user?.id) syncNotificationPrefsToCloud(user.id, next);
    },
    [notificationSettings, user?.id, t],
  );

  const handleToggleDailyReminder = useCallback(
    async (value: boolean) => {
      const next = { ...notificationSettings, dailyReminder: value };
      setNotificationSettings(next);
      await saveNotificationSettings(next);
      if (user?.id) syncNotificationPrefsToCloud(user.id, next);
    },
    [notificationSettings, user?.id],
  );

  const handleChangeDays = useCallback(
    async (days: number) => {
      const next = { ...notificationSettings, daysBeforeExpiration: days };
      setNotificationSettings(next);
      await saveNotificationSettings(next);
      if (user?.id) syncNotificationPrefsToCloud(user.id, next);
    },
    [notificationSettings, user?.id],
  );

  const handleExport = useCallback(
    async (kind: 'json' | 'csv') => {
      if (isExporting) return;
      setIsExporting(true);
      try {
        if (kind === 'json') {
          await exportAndShareJSON();
          Alert.alert(t('export.success'), t('export.jsonSuccess'));
        } else {
          await exportAndShareCSV();
          Alert.alert(t('export.success'), t('export.csvSuccess'));
        }
        await cleanupOldExports();
      } catch {
        Alert.alert(t('common.error'), t('export.exportError'));
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, t],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      {/* Topbar handoff */}
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('account.eyebrow', { defaultValue: 'Mon profil' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('account.title')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 4,
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Forest[600]}
          />
        }
      >
        <ProfileImpactHero />

        {/* ── Compte ──────────────────────────────────────────────────────── */}
        <Section title={t('account.sectionAccount')}>
          {user ? (
            <Card>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: Forest[600] }]}>
                  <Text style={styles.avatarText}>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userName, { color: colors.fg.primary }]}>
                    {user.user_metadata?.full_name || t('account.user')}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.fg.secondary }]}>
                    {user.email}
                  </Text>
                </View>
                <Badge tone={isOnline ? 'success' : 'warning'} variant="soft" dot={false}>
                  {isOnline ? t('account.online') : t('account.offline')}
                </Badge>
              </View>

              {/* Sync status */}
              <View style={[styles.syncBox, { backgroundColor: colors.bg.sunken }]}>
                <View style={styles.syncLeft}>
                  <SymbolView
                    name={pendingChanges > 0 ? 'icloud.and.arrow.up' : 'checkmark.icloud.fill'}
                    size={18}
                    tintColor={Forest[600]}
                  />
                  <Text style={[styles.syncText, { color: colors.fg.primary }]}>
                    {pendingChanges > 0
                      ? t('account.pendingChanges', { count: pendingChanges })
                      : t('account.synced')}
                  </Text>
                </View>
                {pendingChanges > 0 && isOnline && (
                  <Pressable
                    onPress={handleManualSync}
                    disabled={isSyncing}
                    style={({ pressed }) => [
                      styles.syncBtn,
                      { backgroundColor: Forest[600], opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.syncBtnText}>{t('account.sync')}</Text>
                    )}
                  </Pressable>
                )}
              </View>

              <RowButton
                icon="gearshape"
                label={t('account.accountSettings')}
                onPress={() => setAccountSettingsVisible(true)}
              />
              <RowButton
                icon="rectangle.portrait.and.arrow.right"
                label={t('account.logoutAction')}
                onPress={handleLogout}
                destructive
              />
            </Card>
          ) : isLocalMode ? (
            <Card>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: Sage[300] }]}>
                  <SymbolView name="iphone" size={26} tintColor={Forest[600]} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.userName, { color: colors.fg.primary }]}>
                    {t('account.localMode')}
                  </Text>
                  <Text style={[styles.userEmail, { color: colors.fg.secondary }]}>
                    {t('account.localModeDesc')}
                  </Text>
                </View>
              </View>
              <View style={[styles.warningBanner, { backgroundColor: '#FFF4E6' }]}>
                <SymbolView name="exclamationmark.triangle.fill" size={16} tintColor="#B86E00" />
                <Text style={[styles.warningText, { color: '#7A4A00' }]}>
                  {t('account.createAccountWarning')}
                </Text>
              </View>
              <Pressable
                onPress={() => setAuthSheetVisible(true)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: Forest[600], opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <SymbolView name="person.crop.circle.badge.plus" size={18} tintColor="#fff" />
                <Text style={styles.primaryBtnText}>{t('account.createAccount')}</Text>
              </Pressable>
            </Card>
          ) : null}
        </Section>

        {/* ── Succès ──────────────────────────────────────────────────────── */}
        <Section title={t('account.sectionAchievements')}>
          <Pressable
            onPress={() => setAchievementsVisible(true)}
            style={({ pressed }) => [
              styles.achievementsCard,
              { backgroundColor: Forest[600], opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <View style={styles.achievementsRow}>
              <View style={styles.levelCircle}>
                <Text style={styles.levelText}>{gamificationData?.level || 1}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.levelTitle}>
                  {getLevelTitle(gamificationData?.level || 1)}
                </Text>
                <Text style={styles.xpLabel}>{gamificationData?.totalXp || 0} XP</Text>
                <View style={styles.streaksRow}>
                  <Text style={styles.streakText}>
                    🔥 {gamificationData?.streaks.currentDaily || 0}
                    {t('common.dayShort')}
                  </Text>
                  <Text style={styles.streakText}>
                    🌱 {gamificationData?.streaks.currentNoWaste || 0}
                    {t('common.dayShort')}
                  </Text>
                  <Text style={styles.streakText}>
                    🛡️ {gamificationData?.streakFreezes?.available ?? 0}
                  </Text>
                </View>
              </View>
              <SymbolView name="chevron.right" size={18} tintColor="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.xpBarBg}>
              <View
                style={[
                  styles.xpBarFill,
                  {
                    width: `${
                      gamificationData
                        ? (gamificationData.xp / gamificationData.xpToNextLevel) * 100
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.xpBarLabel}>
              {gamificationData?.xp || 0} / {gamificationData?.xpToNextLevel || 100} XP
            </Text>
          </Pressable>
        </Section>

        {/* ── Parrainage ──────────────────────────────────────────────────── */}
        {user && referralInfo?.code && (
          <Section title={t('account.sectionReferral')}>
            <Card>
              <View style={[styles.referralCodeBox, { backgroundColor: Sage[100] }]}>
                <Text style={[styles.referralLabel, { color: colors.fg.secondary }]}>
                  {t('referral.yourCode')}
                </Text>
                <Text style={[styles.referralValue, { color: Forest[600] }]}>
                  {referralInfo.code}
                </Text>
              </View>
              <View style={styles.referralStats}>
                <View style={styles.referralStat}>
                  <Text style={[styles.referralStatValue, { color: Forest[600] }]}>
                    {referralInfo.referralCount}/5
                  </Text>
                  <Text style={[styles.referralStatLabel, { color: colors.fg.tertiary }]}>
                    {t('referral.referrals')}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
                <View style={styles.referralStat}>
                  <Text style={[styles.referralStatValue, { color: Forest[600] }]}>
                    {referralInfo.bonusScansRemaining}
                  </Text>
                  <Text style={[styles.referralStatLabel, { color: colors.fg.tertiary }]}>
                    {t('referral.bonusScans')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.referralDesc, { color: colors.fg.secondary }]}>
                {t('referral.description')}
              </Text>
              <Pressable
                onPress={async () => {
                  if (referralInfo.code) {
                    const shared = await shareReferralLink(referralInfo.code);
                    if (shared) trackReferralCodeShared();
                  }
                }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: Forest[600], opacity: pressed ? 0.85 : 1, marginTop: 14 },
                ]}
              >
                <SymbolView name="square.and.arrow.up" size={18} tintColor="#fff" />
                <Text style={styles.primaryBtnText}>{t('referral.inviteFriend')}</Text>
              </Pressable>
            </Card>
          </Section>
        )}

        {/* ── Abonnement ──────────────────────────────────────────────────── */}
        <Section title={t('account.sectionSubscription')}>
          <Card>
            {isPremium ? (
              <>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: '#D4A017' }]}>
                    <SymbolView name="star.fill" size={26} tintColor="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.userName, { color: colors.fg.primary }]}>
                      {t('account.premium.title')}{' '}
                      {currentPlan === 'yearly'
                        ? t('account.premium.yearly')
                        : t('account.premium.monthly')}
                    </Text>
                    {expirationDate && (
                      <Text style={[styles.userEmail, { color: colors.fg.secondary }]}>
                        {t('account.premium.validUntil')}{' '}
                        {expirationDate.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Badge tone="reward" variant="solid" dot={false}>
                    {t('account.premium.active')}
                  </Badge>
                </View>
                <View style={[styles.premiumInfoBox, { backgroundColor: Sage[100] }]}>
                  <Text style={[styles.premiumInfoText, { color: colors.fg.secondary }]}>
                    {t('account.premiumInfo')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: Sage[300] }]}>
                    <SymbolView name="person.fill" size={26} tintColor={Forest[600]} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.userName, { color: colors.fg.primary }]}>
                      {t('account.freeVersion')}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.fg.secondary }]}>
                      {t('account.maxLists')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setPaywallVisible(true)}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: '#D4A017', opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <SymbolView name="star.fill" size={18} tintColor="#fff" />
                  <Text style={styles.primaryBtnText}>{t('account.premium.upgrade')}</Text>
                </Pressable>
                <Pressable
                  onPress={restorePurchases}
                  disabled={subscriptionLoading}
                  style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  {subscriptionLoading ? (
                    <ActivityIndicator size="small" color={Forest[600]} />
                  ) : (
                    <Text style={[styles.ghostBtnText, { color: Forest[600] }]}>
                      {t('account.premium.restore')}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </Card>
        </Section>

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <Section title={t('account.sectionNotifications')}>
          <Card>
            <SettingRow
              icon="bell.fill"
              title={t('notifications.enable')}
              subtitle={t('notifications.enableDesc')}
              rightElement={
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: colors.border.default, true: Sage[300] }}
                  thumbColor={notificationSettings.enabled ? Forest[600] : '#f0f0f0'}
                  ios_backgroundColor={colors.border.default}
                />
              }
            />
            {notificationSettings.enabled && (
              <>
                <Divider />
                <SettingRow
                  icon="clock.fill"
                  title={t('notifications.dailyReminder')}
                  subtitle={t('notifications.dailyReminderDesc')}
                  rightElement={
                    <Switch
                      value={notificationSettings.dailyReminder}
                      onValueChange={handleToggleDailyReminder}
                      trackColor={{ false: colors.border.default, true: Sage[300] }}
                      thumbColor={
                        notificationSettings.dailyReminder ? Forest[600] : '#f0f0f0'
                      }
                      ios_backgroundColor={colors.border.default}
                    />
                  }
                />
                <Divider />
                <View style={styles.daysBlock}>
                  <View style={styles.rowHeader}>
                    <View style={[styles.rowIcon, { backgroundColor: Sage[100] }]}>
                      <SymbolView name="calendar" size={16} tintColor={Forest[600]} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.rowTitle, { color: colors.fg.primary }]}>
                        {t('notifications.daysBeforeExpiration')}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.fg.secondary }]}>
                        {t('notifications.daysBeforeExpirationDesc')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.daysButtonRow}>
                    {[1, 2, 3, 5, 7].map((days) => {
                      const isActive = notificationSettings.daysBeforeExpiration === days;
                      return (
                        <Pressable
                          key={days}
                          onPress={() => handleChangeDays(days)}
                          style={({ pressed }) => [
                            styles.dayBtn,
                            {
                              backgroundColor: isActive ? Forest[600] : colors.bg.sunken,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayBtnText,
                              { color: isActive ? '#fff' : colors.fg.primary },
                            ]}
                          >
                            {days}
                            {t('common.dayShort')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </Card>
        </Section>

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <Section title={t('account.sectionExport')}>
          {exportStats && (
            <Card style={{ marginBottom: 10 }}>
              <ExportStatRow
                label={t('export.lists')}
                value={String(exportStats.totalLists)}
                isLast={false}
              />
              <ExportStatRow
                label={t('export.items')}
                value={String(exportStats.totalItems)}
                isLast={false}
              />
              <ExportStatRow
                label={t('export.estimatedSize')}
                value={exportStats.estimatedSize}
                isLast
              />
            </Card>
          )}
          <View style={styles.exportBtnRow}>
            <Pressable
              onPress={() => handleExport('json')}
              disabled={isExporting}
              style={({ pressed }) => [
                styles.exportBtn,
                {
                  backgroundColor: Forest[600],
                  opacity: isExporting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <SymbolView name="curlybraces" size={26} tintColor="#fff" />
              <Text style={[styles.exportBtnTitle, { color: '#fff' }]}>{t('export.json')}</Text>
              <Text style={[styles.exportBtnSub, { color: 'rgba(255,255,255,0.85)' }]}>
                {t('export.jsonDesc')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleExport('csv')}
              disabled={isExporting}
              style={({ pressed }) => [
                styles.exportBtn,
                {
                  backgroundColor: colors.bg.surface,
                  borderWidth: 1,
                  borderColor: Forest[600],
                  opacity: isExporting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <SymbolView name="tablecells" size={26} tintColor={Forest[600]} />
              <Text style={[styles.exportBtnTitle, { color: Forest[600] }]}>
                {t('export.csv')}
              </Text>
              <Text style={[styles.exportBtnSub, { color: colors.fg.secondary }]}>
                {t('export.csvDesc')}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.infoBanner, { backgroundColor: '#FFF4E6' }]}>
            <SymbolView name="info.circle.fill" size={16} tintColor="#B86E00" />
            <Text style={[styles.infoBannerText, { color: '#7A4A00' }]}>
              {t('export.privacyInfo')}
            </Text>
          </View>
        </Section>

        {/* ── Langue ──────────────────────────────────────────────────────── */}
        <Section title={t('account.sectionLanguage')}>
          <LanguageButton onPress={() => setLanguageModalVisible(true)} />
        </Section>

        {/* ── Support ─────────────────────────────────────────────────────── */}
        <Section title={t('account.sectionSupport')}>
          <Card noPadding>
            <RowButton
              icon="envelope.fill"
              label={t('support.feedback')}
              onPress={() => setFeedbackModalVisible(true)}
            />
            <Divider />
            <RowButton
              icon="star.fill"
              label={t('support.rateApp')}
              accent="#D4A017"
              onPress={async () => {
                if (await StoreReview.hasAction()) await StoreReview.requestReview();
              }}
            />
            <Divider />
            <RowButton
              icon="doc.text.fill"
              label={t('support.legal')}
              onPress={() => setLegalModalVisible(true)}
            />
          </Card>
        </Section>

        {/* ── Réseaux sociaux ─────────────────────────────────────────────── */}
        <Section title={t('account.sectionSocial')}>
          <View style={styles.socialRow}>
            <SocialBtn
              label="Instagram"
              icon="camera.fill"
              color="#E1306C"
              onPress={() => Linking.openURL('https://www.instagram.com/zerogaspyapp/')}
            />
            <SocialBtn
              label="X (Twitter)"
              icon="bird.fill"
              color={Forest[600]}
              onPress={() => Linking.openURL('https://x.com/zerogaspy')}
            />
          </View>
        </Section>
      </ScrollView>

      {/* Modals */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
      <AccountSettingsModal
        visible={accountSettingsVisible}
        onClose={() => setAccountSettingsVisible(false)}
      />
      <LegalModal visible={legalModalVisible} onClose={() => setLegalModalVisible(false)} />
      <AchievementsModal
        visible={achievementsVisible}
        onClose={() => setAchievementsVisible(false)}
      />
      <PaywallSheet
        {...paywallProps}
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="addList"
      />
      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
      <DeferredAuthSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
        reason="backup"
        onAppleSignIn={async () => {
          const { error } = await signInWithApple();
          if (!error) setAuthSheetVisible(false);
        }}
        onEmailSignUp={() => {
          setAuthSheetVisible(false);
          navigation.navigate('Register');
        }}
      />
    </View>
  );
}

// ============================================================================
// Atoms locaux
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.fg.primary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Card({
  children,
  noPadding,
  style,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
  style?: any;
}) {
  const { colors, componentRadius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bg.surface,
          borderColor: colors.border.subtle,
          borderRadius: componentRadius.card,
          padding: noPadding ? 0 : 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />;
}

function SettingRow({
  icon,
  title,
  subtitle,
  rightElement,
}: {
  icon: SFSymbol;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.settingRow}>
      <View style={[styles.rowIcon, { backgroundColor: Sage[100] }]}>
        <SymbolView name={icon} size={16} tintColor={Forest[600]} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.rowTitle, { color: colors.fg.primary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: colors.fg.secondary }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </View>
  );
}

function RowButton({
  icon,
  label,
  onPress,
  destructive,
  accent,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accent?: string;
}) {
  const { colors } = useTheme();
  const tintColor = destructive ? colors.feedback.danger.solid : accent ?? Forest[600];
  const bgIcon = destructive
    ? colors.feedback.danger.bg
    : accent
    ? `${accent}1A`
    : Sage[100];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: bgIcon }]}>
        <SymbolView name={icon} size={16} tintColor={tintColor} />
      </View>
      <Text
        style={[
          styles.rowTitle,
          { color: destructive ? colors.feedback.danger.solid : colors.fg.primary, flex: 1, marginLeft: 10 },
        ]}
      >
        {label}
      </Text>
      <SymbolView name="chevron.right" size={14} tintColor={colors.fg.tertiary} />
    </Pressable>
  );
}

function ExportStatRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.exportStatRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
      ]}
    >
      <Text style={[styles.exportStatLabel, { color: colors.fg.secondary }]}>{label}</Text>
      <Text style={[styles.exportStatValue, { color: colors.fg.primary }]}>{value}</Text>
    </View>
  );
}

function SocialBtn({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: SFSymbol;
  color: string;
  onPress: () => void;
}) {
  const { colors, componentRadius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialBtn,
        {
          backgroundColor: colors.bg.surface,
          borderColor: colors.border.subtle,
          borderRadius: componentRadius.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <SymbolView name={icon} size={26} tintColor={color} />
      <Text style={[styles.socialText, { color: colors.fg.primary }]}>{label}</Text>
    </Pressable>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 4,
  },

  // Section
  section: {
    marginBottom: 22,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
  },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },

  // Sync box
  syncBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },

  // Warning banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ghostBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  ghostBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Achievements card
  achievementsCard: {
    borderRadius: 18,
    padding: 16,
  },
  achievementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  levelText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  levelTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  xpLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  streaksRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  streakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  xpBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 14,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#FFE082',
    borderRadius: 3,
  },
  xpBarLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '600',
  },

  // Referral
  referralCodeBox: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  referralLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referralValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  referralStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  referralStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  referralStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  referralStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  referralDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Premium info box
  premiumInfoBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  premiumInfoText: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Days block
  daysBlock: {
    padding: 14,
  },
  daysButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  dayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Export
  exportStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  exportStatLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  exportStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  exportBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  exportBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  exportBtnSub: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 6,
  },
  socialText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
