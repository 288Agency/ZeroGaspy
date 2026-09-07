import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import logger from '../utils/logger';
import { getMonthlySavings } from '../services/monthlySavingsService';

interface FoodItem {
  id: string;
  name: string;
  expirationDate: string;
  status: 'active' | 'consumed' | 'thrown';
}

interface List {
  id: string;
  title: string;
  items: FoodItem[];
}

export interface ExpiringFood {
  name: string;
  daysLeft: number;
  listName: string;
}

const LISTS_KEY = 'inventory_lists';

/** Horizon du widget, en jours. Le feed de l'accueil utilise le même. */
export const WIDGET_HORIZON_DAYS = 7;

function getDaysUntilExpiration(dateString: string): number {
  if (!dateString) return Infinity;

  const parts = dateString.split('/');
  if (parts.length !== 3) return Infinity;

  const [day, month, year] = parts.map(Number);
  const expirationDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expirationDate.setHours(0, 0, 0, 0);

  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export async function getExpiringFoods(daysThreshold: number = 3): Promise<ExpiringFood[]> {
  try {
    const listsData = await AsyncStorage.getItem(LISTS_KEY);
    if (!listsData) return [];

    const lists: List[] = JSON.parse(listsData);
    const expiringFoods: ExpiringFood[] = [];

    for (const list of lists) {
      if (!list.items) continue;

      for (const item of list.items) {
        // Aligné avec isActiveItem : pas seulement status === 'active'
        if (item.status === 'consumed' || item.status === 'thrown') continue;
        if (!item.expirationDate) continue;

        const daysLeft = getDaysUntilExpiration(item.expirationDate);

        // Inclure les aliments qui expirent dans les X jours ou déjà expirés
        if (daysLeft <= daysThreshold) {
          expiringFoods.push({
            name: item.name,
            daysLeft,
            listName: list.title,
          });
        }
      }
    }

    // Trier par date d'expiration (les plus urgents en premier)
    expiringFoods.sort((a, b) => a.daysLeft - b.daysLeft);

    return expiringFoods;
  } catch (error) {
    // Ne pas renvoyer [] ici : un stockage illisible deviendrait un « tout va
    // bien » silencieux sur l'écran d'accueil. Les appelants décident.
    logger.error('Erreur widget data:', error);
    throw error;
  }
}

// Sauvegarder les données pour le widget (appelé depuis l'app)
export async function updateWidgetData(): Promise<void> {
  try {
    const [expiringFoods, monthlySavings] = await Promise.all([
      getExpiringFoods(WIDGET_HORIZON_DAYS),
      getMonthlySavings(),
    ]);
    const widgetData = {
      expiringFoods,
      monthlySavings,
      lastUpdated: new Date().toISOString(),
    };

    // Sauvegarder dans AsyncStorage (cache interne)
    await AsyncStorage.setItem('@zerogaspy_widget_data', JSON.stringify(widgetData));

    if (Platform.OS === 'android') {
      try {
        const { requestWidgetUpdate } = require('react-native-android-widget');
        await requestWidgetUpdate({
          widgetName: 'ExpiringFoods',
          renderWidget: () => {
            const { ExpiringFoodsWidget } = require('./ExpiringFoodsWidget');
            const React = require('react');
            return React.createElement(ExpiringFoodsWidget, { expiringFoods });
          },
        });
      } catch {
        logger.info('Android widget update skipped (not installed)');
      }
    } else if (Platform.OS === 'ios') {
      try {
        const DefaultPreference = require('react-native-default-preference').default;
        await DefaultPreference.setName('group.com.zerogaspy.app.widget');
        await DefaultPreference.set('widgetData', JSON.stringify(widgetData));
        logger.info('iOS widget data written to App Group UserDefaults');
      } catch {
        logger.info('iOS widget update skipped (App Group not configured)');
      }
    }
  } catch (error) {
    logger.error('Erreur update widget data:', error);
  }
}

/**
 * Lit le cache écrit par updateWidgetData, et RIEN d'autre.
 *
 * Cette fonction calculait aussi les données quand le cache était vide, si bien
 * qu'elle ne renvoyait jamais null — le repli de son appelant était donc du
 * code mort et le widget affichait éternellement le cache. C'est un cache, il
 * doit pouvoir répondre « je n'ai rien ».
 */
export async function getWidgetData(): Promise<{ expiringFoods: ExpiringFood[]; lastUpdated: string } | null> {
  try {
    const data = await AsyncStorage.getItem('@zerogaspy_widget_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Erreur get widget data:', error);
    return null;
  }
}
