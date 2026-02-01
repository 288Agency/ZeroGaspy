import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ExpiringFoodsWidget } from './ExpiringFoodsWidget';
import { getWidgetData, getExpiringFoods } from './widgetDataService';

const nameToWidget = {
  ExpiringFoods: ExpiringFoodsWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName as keyof typeof nameToWidget;

  // Récupérer les données des aliments qui expirent
  const fetchData = async () => {
    try {
      // Essayer d'abord le cache, sinon récupérer directement
      const cachedData = await getWidgetData();
      if (cachedData) {
        return cachedData.expiringFoods;
      }
      return await getExpiringFoods(7);
    } catch (error) {
      console.error('Widget: erreur récupération données', error);
      return [];
    }
  };

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const expiringFoods = await fetchData();

      if (widgetName === 'ExpiringFoods') {
        props.renderWidget(
          <ExpiringFoodsWidget expiringFoods={expiringFoods} />
        );
      }
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
