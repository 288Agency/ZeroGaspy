import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLists } from '../utils/localStorage';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import logger from '../utils/logger';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const LAST_NOTIFICATION_CHECK_KEY = 'last_notification_check';

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

  // Configuration Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiration', {
      name: 'Alertes d\'expiration',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3C6E47',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Rappel quotidien',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

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
  } catch (error: any) {
    logger.error('Erreur lors de la sauvegarde des paramètres:', error.message);
  }
}

// Annuler toutes les notifications programmées
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Programmer les notifications d'expiration
export async function scheduleExpirationNotifications(): Promise<void> {
  const settings = await loadNotificationSettings();

  if (!settings.enabled) {
    await cancelAllNotifications();
    return;
  }

  // Annuler les anciennes notifications
  await cancelAllNotifications();

  const lists = await loadLists();
  const expiringItems: Array<{ name: string; days: number; listTitle: string }> = [];

  // Collecter tous les aliments qui expirent bientôt
  lists.forEach((list) => {
    list.items.forEach((item) => {
      if (item.status === 'consumed' || item.status === 'thrown') return;

      const days = getDaysUntilExpiration(item.expirationDate);
      if (days !== null && days >= 0 && days <= settings.daysBeforeExpiration) {
        expiringItems.push({
          name: item.name,
          days,
          listTitle: list.title,
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
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Aliments à consommer aujourd\'hui !',
          body: expiringToday.length === 1
            ? `${expiringToday[0].name} expire aujourd'hui`
            : `${expiringToday.length} aliments expirent aujourd'hui`,
          data: { type: 'expiration_today', foodName: expiringToday[0].name },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: days === 1 ? '⏰ Expire demain !' : `📅 Expire dans ${days} jours`,
        body: items.length === 1
          ? `${items[0].name} (${items[0].listTitle})`
          : `${items.length} aliments arrivent à expiration`,
        data: { type: 'expiration_warning', days, foodName: items[0].name },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Test réussi !',
      body: 'Les notifications ZeroGaspy fonctionnent correctement',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEn ? '🌿 Your streak continues!' : '🌿 Ta streak continue !',
        body: isEn ? 'Check your fridge — some items might expire soon.' : 'Vérifie ton frigo — des aliments pourraient bientôt expirer.',
        data: { type: 'daily_reminder' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 23 * 60 * 60,
      },
    });

    await AsyncStorage.setItem(WELCOME_BACK_NOTIF_KEY, 'true');
    logger.info('D+1 welcome-back notification scheduled');
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

export async function scheduleDinnerReminderNotification(lang: string = 'fr'): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DINNER_NOTIFICATION_ID).catch(() => {});

    const lists = await loadLists();
    const expiringNames: string[] = [];

    for (const list of lists) {
      for (const item of list.items) {
        if (item.status === 'consumed' || item.status === 'thrown') continue;
        const days = getDaysUntilExpiration(item.expirationDate);
        if (days !== null && days >= 0 && days <= 2) {
          expiringNames.push(item.name);
        }
      }
    }

    if (expiringNames.length === 0) return;

    const firstName = expiringNames[0];
    const others = expiringNames.length > 1 ? ` et ${expiringNames.length - 1} autre${expiringNames.length > 2 ? 's' : ''}` : '';

    const title = lang === 'fr'
      ? '🍽️ Ce soir, mange ça !'
      : '🍽️ Tonight, use this!';

    const body = lang === 'fr'
      ? `${firstName}${others} expire${expiringNames.length > 1 ? 'nt' : ''} bientôt. Voir une recette ?`
      : `${firstName}${others} expire${expiringNames.length > 1 ? '' : 's'} soon. Check a recipe?`;

    await Notifications.scheduleNotificationAsync({
      identifier: DINNER_NOTIFICATION_ID,
      content: {
        title,
        body,
        data: { type: 'daily_recipe', foodName: firstName },
        sound: true,
      },
      trigger: {
        hour: 17,
        minute: 0,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });

    logger.info('Notification dîner planifiée:', { itemsExpiring: expiringNames.length });
  } catch (error) {
    logger.error('scheduleDinnerReminderNotification error:', error);
  }
}
