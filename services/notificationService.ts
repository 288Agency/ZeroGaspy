import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLists } from '../utils/localStorage';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import logger from '../utils/logger';
import { isActiveItem } from '../utils/foodItems';
import { resolveItemLineValue } from './priceEstimateService';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const LAST_NOTIFICATION_CHECK_KEY = 'last_notification_check';

/** Channels Android — doivent être créés ET passés dans chaque trigger. */
export const ANDROID_CHANNEL = {
  expiration: 'expiration',
  daily: 'daily',
} as const;

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // Format "HH:MM"
  daysBeforeExpiration: number; // Alerter X jours avant expiration
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminder: true,
  dailyReminderTime: '09:00',
  daysBeforeExpiration: 3,
};

/**
 * Crée / met à jour les channels Android.
 * Sans channelId sur le trigger, Android 8+ mute ou route vers le channel par défaut.
 */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL.expiration, {
    name: "Alertes d'expiration",
    description: 'Rappels quand un aliment arrive à expiration',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3C6E47',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL.daily, {
    name: 'Rappels ZeroGaspy',
    description: 'Rappel quotidien, dîner et bilan hebdo',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });
}

// Demander les permissions de notification
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    logger.info('Les notifications ne fonctionnent que sur un appareil physique');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('Permission de notification refusée');
    return false;
  }

  await ensureAndroidNotificationChannels();

  return true;
}

// Charger les paramètres de notification
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (json) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    }
    return DEFAULT_SETTINGS;
  } catch (error: any) {
    logger.error('Erreur lors du chargement des paramètres:', error.message);
    return DEFAULT_SETTINGS;
  }
}

// Sauvegarder les paramètres de notification
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    // Reprogrammer les notifications avec les nouveaux paramètres
    await scheduleExpirationNotifications();
    if (settings.enabled) {
      await refreshLocalSecondaryNotifications();
    }
  } catch (error: any) {
    logger.error('Erreur lors de la sauvegarde des paramètres:', error.message);
  }
}

// Annuler toutes les notifications programmées
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Annule seulement les notifs d'expiration / rappel quotidien — préserve dîner + weekly. */
async function cancelExpirationRelatedNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) => {
      const t = (n.content.data as { type?: string } | undefined)?.type;
      return t === 'expiration_today' || t === 'expiration_warning' || t === 'daily_reminder';
    });
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (err) {
    logger.error('cancelExpirationRelatedNotifications failed:', err);
  }
}

// Programmer les notifications d'expiration
export async function scheduleExpirationNotifications(): Promise<void> {
  const settings = await loadNotificationSettings();

  if (!settings.enabled) {
    await cancelAllNotifications();
    return;
  }

  await ensureAndroidNotificationChannels();

  // Ne PAS cancelAll : ça effaçait dîner + weekly à chaque saveLists.
  await cancelExpirationRelatedNotifications();

  const lists = await loadLists();
  const expiringItems: Array<{
    name: string;
    days: number;
    listTitle: string;
    itemId: string;
    listId: string;
  }> = [];

  // Collecter tous les aliments qui expirent bientôt
  lists.forEach((list) => {
    list.items.forEach((item) => {
      if (!isActiveItem(item)) return;

      const days = getDaysUntilExpiration(item.expirationDate);
      if (days !== null && days >= 0 && days <= settings.daysBeforeExpiration) {
        expiringItems.push({
          name: item.name,
          days,
          listTitle: list.title,
          itemId: item.id,
          listId: list.id,
        });
      }
    });
  });

  // Programmer le rappel quotidien si activé
  if (settings.dailyReminder && expiringItems.length > 0) {
    const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number);

    // Notification immédiate pour les items qui expirent aujourd'hui
    const expiringToday = expiringItems.filter((item) => item.days === 0);
    if (expiringToday.length > 0) {
      const first = expiringToday[0];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Aliments à consommer aujourd\'hui !',
          body: expiringToday.length === 1
            ? `${first.name} expire aujourd'hui`
            : `${expiringToday.length} aliments expirent aujourd'hui`,
          data: {
            type: 'expiration_today',
            foodName: first.name,
            itemId: first.itemId,
            listId: first.listId,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: ANDROID_CHANNEL.expiration,
        },
      });
    }

    // Notification quotidienne programmée
    const totalExpiring = expiringItems.length;
    if (totalExpiring > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🥗 Rappel ZeroGaspy',
          body: totalExpiring === 1
            ? `1 aliment expire bientôt`
            : `${totalExpiring} aliments expirent bientôt`,
          data: { type: 'daily_reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
          channelId: ANDROID_CHANNEL.daily,
        },
      });
    }
  }

  // Programmer des notifications individuelles pour chaque jour d'expiration
  const itemsByDay = new Map<number, typeof expiringItems>();
  expiringItems.forEach((item) => {
    if (!itemsByDay.has(item.days)) {
      itemsByDay.set(item.days, []);
    }
    itemsByDay.get(item.days)!.push(item);
  });

  for (const [days, items] of itemsByDay) {
    if (days === 0) continue; // Déjà géré ci-dessus

    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + days);
    triggerDate.setHours(9, 0, 0, 0);

    // Ne pas programmer dans le passé
    if (triggerDate.getTime() <= Date.now()) continue;

    const first = items[0];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: days === 1 ? '⏰ Expire demain !' : `📅 Expire dans ${days} jours`,
        body: items.length === 1
          ? `${first.name} (${first.listTitle})`
          : `${items.length} aliments arrivent à expiration`,
        data: {
          type: 'expiration_warning',
          days,
          foodName: first.name,
          itemId: first.itemId,
          listId: first.listId,
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ANDROID_CHANNEL.expiration,
      },
    });
  }

  logger.info(`${expiringItems.length} notifications programmées`);
}

// Vérifier et mettre à jour les notifications (à appeler au démarrage et après modification)
export async function checkAndScheduleNotifications(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (hasPermission) {
    await scheduleExpirationNotifications();
  }
}

// Envoyer une notification de test
export async function sendTestNotification(): Promise<void> {
  await ensureAndroidNotificationChannels();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Test réussi !',
      body: 'Les notifications ZeroGaspy fonctionnent correctement',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: ANDROID_CHANNEL.daily,
    },
  });
}

const WELCOME_BACK_NOTIF_KEY = 'welcome_back_notif_scheduled';

export async function scheduleWelcomeBackNotification(locale: string = 'fr'): Promise<void> {
  try {
    const alreadyScheduled = await AsyncStorage.getItem(WELCOME_BACK_NOTIF_KEY);
    if (alreadyScheduled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const isEn = locale.startsWith('en');

    // Lire les aliments expirant dans les 3 prochains jours au moment du scheduling
    const lists = await loadLists();
    const expiringItems: string[] = [];
    for (const list of lists) {
      for (const item of list.items) {
        if (!isActiveItem(item)) continue;
        const days = getDaysUntilExpiration(item.expirationDate);
        if (days !== null && days >= 0 && days <= 3) {
          expiringItems.push(item.name);
        }
      }
    }

    const count = expiringItems.length;
    const firstName = expiringItems[0];

    let title: string;
    let body: string;
    let notifType: string;
    let foodName: string | undefined;

    if (count > 0) {
      title = isEn ? '🌿 Your streak continues!' : '🌿 Ta série continue !';
      body = isEn
        ? `${firstName} and ${count > 1 ? count - 1 + ' other items expire' : 'it expires'} soon — check a recipe!`
        : `${firstName}${count > 1 ? ` et ${count - 1} autre${count > 2 ? 's' : ''}` : ''} expire${count > 1 ? 'nt' : ''} bientôt — voir une recette ?`;
      notifType = 'daily_recipe';
      foodName = firstName;
    } else {
      title = isEn ? '🌿 Your streak continues!' : '🌿 Ta série continue !';
      body = isEn
        ? 'Check your fridge — keep your no-waste streak going!'
        : 'Vérifie ton frigo pour garder ta série sans gaspi !';
      notifType = 'daily_reminder';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: notifType, ...(foodName ? { foodName } : {}) },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 23 * 60 * 60,
        channelId: ANDROID_CHANNEL.daily,
      },
    });

    await AsyncStorage.setItem(WELCOME_BACK_NOTIF_KEY, 'true');
    logger.info('D+1 welcome-back notification scheduled', { expiringCount: count });
  } catch (error) {
    logger.error('Error scheduling welcome-back notification:', error);
  }
}

// Écouter les notifications reçues
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Écouter les réponses aux notifications (quand l'utilisateur clique)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

const DINNER_NOTIFICATION_ID = 'dinner_reminder_daily';
const WEEKLY_RECAP_NOTIF_ID = 'weekly_recap_sunday';

/**
 * Dîner + récap hebdo : replanifiés à chaque mutation d'inventaire.
 * Sans ça, les guests (pas de push serveur) gardaient un contenu figé
 * jusqu'au prochain cold start de l'app.
 */
export async function refreshLocalSecondaryNotifications(lang: string = 'fr'): Promise<void> {
  try {
    const settings = await loadNotificationSettings();
    if (!settings.enabled) return;
    await Promise.all([
      scheduleDinnerReminderNotification(lang),
      scheduleWeeklyRecapNotification(lang),
    ]);
  } catch (error) {
    logger.error('refreshLocalSecondaryNotifications error:', error);
  }
}

export async function scheduleDinnerReminderNotification(lang: string = 'fr'): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DINNER_NOTIFICATION_ID).catch(() => {});
    await ensureAndroidNotificationChannels();

    const lists = await loadLists();
    const expiring: Array<{ name: string; itemId: string; listId: string }> = [];
    const anyItem: Array<{ name: string; itemId: string; listId: string }> = [];

    for (const list of lists) {
      for (const item of list.items) {
        if (!isActiveItem(item)) continue;
        const entry = { name: item.name, itemId: item.id, listId: list.id };
        anyItem.push(entry);
        const days = getDaysUntilExpiration(item.expirationDate);
        if (days !== null && days >= 0 && days <= 2) {
          expiring.push(entry);
        }
      }
    }

    // Ce rappel ne partait QUE si quelque chose expirait sous 48 h. Or on
    // remplit son frigo avec du frais : rien ne perime avant 4 ou 5 jours, donc
    // il restait muet pendant toute la premiere semaine — exactement quand
    // l'habitude se forme. Il part desormais des qu'il y a de quoi cuisiner, et
    // ne mentionne l'urgence que lorsqu'elle existe reellement.
    const source = expiring.length > 0 ? expiring : anyItem;
    if (source.length === 0) return;

    const isUrgent = expiring.length > 0;
    const first = source[0];
    const others = source.length > 1 ? ` et ${source.length - 1} autre${source.length > 2 ? 's' : ''}` : '';

    const title = lang === 'fr'
      ? '🍽️ Ce soir, mange ça !'
      : '🍽️ Tonight, use this!';

    const body = isUrgent
      ? (lang === 'fr'
        ? `${first.name}${others} expire${source.length > 1 ? 'nt' : ''} bientôt. Cuisiner ce soir ?`
        : `${first.name}${others} expire${source.length > 1 ? '' : 's'} soon. Cook tonight?`)
      : (lang === 'fr'
        ? `Tu as ${first.name}${others} sous la main. On te trouve une recette ?`
        : `You have ${first.name}${others} on hand. Want a recipe?`);

    await Notifications.scheduleNotificationAsync({
      identifier: DINNER_NOTIFICATION_ID,
      content: {
        title,
        body,
        data: {
          type: 'daily_recipe',
          foodName: first.name,
          itemId: first.itemId,
          listId: first.listId,
        },
        sound: true,
      },
      trigger: {
        hour: 17,
        minute: 0,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: ANDROID_CHANNEL.daily,
      },
    });

    logger.info('Notification dîner planifiée:', { itemsExpiring: expiring.length });
  } catch (error) {
    logger.error('scheduleDinnerReminderNotification error:', error);
  }
}

export async function scheduleWeeklyRecapNotification(lang: string = 'fr'): Promise<void> {
  try {
    // Annuler l'ancienne pour éviter les doublons si on reschedule
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_NOTIF_ID).catch(() => {});

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Calculer les stats de la semaine courante
    const lists = await loadLists();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    let consumedCount = 0;
    let thrownCount = 0;
    let savedAmount = 0;

    for (const list of lists) {
      for (const item of list.items) {
        const date = item.consumedAt ? new Date(item.consumedAt) : null;
        if (!date || date < weekStart) continue;
        if (item.status === 'consumed') {
          consumedCount++;
          savedAmount += resolveItemLineValue(item);
        } else if (item.status === 'thrown') {
          thrownCount++;
        }
      }
    }

    const isEn = lang.startsWith('en');
    const savedRounded = Math.round(savedAmount);

    const title = isEn ? '🌱 Your weekly recap is ready!' : '🌱 Ton bilan de la semaine !';
    let body: string;

    if (consumedCount > 0 && thrownCount === 0) {
      body = isEn
        ? `Perfect week! ${consumedCount} items used, ~${savedRounded}€ saved — zero waste 🎉`
        : `Semaine parfaite ! ${consumedCount} aliment${consumedCount > 1 ? 's' : ''} utilisé${consumedCount > 1 ? 's' : ''}, ~${savedRounded} € économisés — zéro gaspi 🎉`;
    } else if (consumedCount > 0) {
      body = isEn
        ? `This week: ${consumedCount} items used, ~${savedRounded}€ saved. ${thrownCount} wasted — let's do better!`
        : `Cette semaine : ${consumedCount} utilisé${consumedCount > 1 ? 's' : ''}, ~${savedRounded} € économisés. ${thrownCount} jeté${thrownCount > 1 ? 's' : ''} — on fait mieux !`;
    } else {
      body = isEn
        ? 'Check your fridge — start saving money this week!'
        : 'Jette un œil au frigo — commence à économiser cette semaine !';
    }

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_RECAP_NOTIF_ID,
      content: {
        title,
        body,
        data: { type: 'weekly_recap' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = dimanche
        hour: 20,
        minute: 0,
        channelId: ANDROID_CHANNEL.daily,
      },
    });

    logger.info('Weekly recap notification scheduled', { consumedCount, thrownCount, savedRounded });
  } catch (error) {
    logger.error('scheduleWeeklyRecapNotification error:', error);
  }
}
