import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ExpiringFoodsWidget } from './ExpiringFoodsWidget';
import {
  getWidgetData,
  getExpiringFoods,
  WIDGET_HORIZON_DAYS,
  type ExpiringFood,
} from './widgetDataService';
import logger from '../utils/logger';

const nameToWidget = {
  ExpiringFoods: ExpiringFoodsWidget,
};

/**
 * Le cache n'est écrit que par saveLists(). S'en servir en premier fige le
 * widget sur l'état du dernier enregistrement — un frigo rempli après coup
 * restait affiché comme vide indéfiniment. On recalcule donc à chaque réveil,
 * et le cache ne sert plus que de filet quand la lecture échoue.
 */
async function fetchExpiringFoods(): Promise<ExpiringFood[]> {
  try {
    return await getExpiringFoods(WIDGET_HORIZON_DAYS);
  } catch (error) {
    logger.error('Widget: lecture directe impossible, repli sur le cache', error);
    const cached = await getWidgetData();
    return cached?.expiringFoods ?? [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName as keyof typeof nameToWidget;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetName !== 'ExpiringFoods') break;

      const expiringFoods = await fetchExpiringFoods();
      props.renderWidget(<ExpiringFoodsWidget expiringFoods={expiringFoods} />);
      break;
    }

    case 'WIDGET_DELETED':
      // Rien à faire
      break;

    case 'WIDGET_CLICK': {
      const clickAction = props.clickAction;

      if (clickAction === 'OPEN_APP') {
        // L'app s'ouvre automatiquement
        // On pourrait naviguer vers un écran spécifique ici
      }
      break;
    }

    default:
      break;
  }
}
