import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';

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

const LISTS_KEY = '@zerogaspy_lists';

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
        if (item.status !== 'active') continue;
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
    console.error('Erreur widget data:', error);
    return [];
  }
}

// Sauvegarder les données pour le widget (appelé depuis l'app)
export async function updateWidgetData(): Promise<void> {
  try {
    const expiringFoods = await getExpiringFoods(7);
    const widgetData = {
      expiringFoods,
      lastUpdated: new Date().toISOString(),
    };

    // Sauvegarder dans AsyncStorage (pour l'app)
    await AsyncStorage.setItem('@zerogaspy_widget_data', JSON.stringify(widgetData));

    if (Platform.OS === 'android') {
      // Demander au widget Android de se mettre à jour
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
      } catch (widgetError) {
        // Ignorer si le widget n'est pas installé
        console.log('Widget update skipped:', widgetError);
      }
    } else if (Platform.OS === 'ios') {
      // Sauvegarder dans UserDefaults avec App Group pour iOS
      try {
        await DefaultPreference.setName('group.com.zerogaspy.app');
        await DefaultPreference.set('widgetData', JSON.stringify(widgetData));

        // Demander au widget de se rafraîchir (iOS 14+)
        const { WidgetKit } = require('react-native');
        if (WidgetKit?.reloadAllTimelines) {
          WidgetKit.reloadAllTimelines();
        }
      } catch (iosError) {
        console.log('iOS widget update skipped:', iosError);
      }
    }
  } catch (error) {
    console.error('Erreur update widget data:', error);
  }
}

// Récupérer les données cachées pour le widget
export async function getWidgetData(): Promise<{ expiringFoods: ExpiringFood[]; lastUpdated: string } | null> {
  try {
    const data = await AsyncStorage.getItem('@zerogaspy_widget_data');
    if (data) {
      return JSON.parse(data);
    }
    // Si pas de cache, récupérer directement
    const expiringFoods = await getExpiringFoods(7);
    return {
      expiringFoods,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Erreur get widget data:', error);
    return null;
  }
}
