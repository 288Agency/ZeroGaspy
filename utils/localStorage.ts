import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { List, FoodItem } from '../types';
import { scheduleExpirationNotifications } from '../services/notificationService';
import { sanitizeString, validateListTitle } from './security';
import { formatDateToDDMMYYYY, parseDDMMYYYY } from './dateUtils';
import { addToSyncQueue, syncWithCloud } from '../services/supabase/syncService';
import { supabase } from '../config/supabase';
import { updateWidgetData } from '../widgets/widgetDataService';
import logger from './logger';

const LISTS_KEY = 'inventory_lists';
const ALLOWED_KEYS = [LISTS_KEY, 'notification_settings', 'last_notification_check', 'supabase_'];

// Convertit une date DD/MM/YYYY en ISO YYYY-MM-DD pour PostgreSQL
function convertDateForCloud(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  // Si déjà au format ISO (YYYY-MM-DD)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0];
  }
  // Format DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Récupère l'ID utilisateur connecté (null si mode local)
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// Déclenche une sync avec le cloud si l'utilisateur est connecté
async function triggerCloudSync(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: 'lists' | 'food_items',
  localId: string,
  payload: any
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      await addToSyncQueue(userId, operation, tableName, localId, payload);
      // Tenter une sync immédiate (non-bloquante)
      syncWithCloud(userId).catch((e) =>
        logger.info('Sync différée (offline?):', e.message)
      );
    }
  } catch (error) {
    logger.error('Erreur sync queue:', error);
  }
}

function isValidKey(key: string): boolean {
  return ALLOWED_KEYS.includes(key) || key.startsWith('cache_');
}

// Helper to find list and optionally item by IDs
async function findListAndItem(
  listId: string,
  itemId?: string
): Promise<{ lists: List[]; listIndex: number; itemIndex?: number }> {
  const lists = await loadLists();
  const listIndex = lists.findIndex((list) => list.id === listId);
  if (listIndex === -1) {
    throw new Error(`Liste avec l'id ${listId} introuvable`);
  }
  if (itemId) {
    const itemIndex = lists[listIndex].items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Aliment avec l'id ${itemId} introuvable`);
    }
    return { lists, listIndex, itemIndex };
  }
  return { lists, listIndex };
}

// Calculate new expiration date after opening
function calculateOpenedExpirationDate(openedDate: string, daysAfterOpening: number): string {
  const opened = parseDDMMYYYY(openedDate);
  if (!opened) return openedDate;
  opened.setDate(opened.getDate() + daysAfterOpening);
  return formatDateToDDMMYYYY(opened);
}

// Generic storage functions
export async function saveData(key: string, value: any) {
  if (!isValidKey(key)) {
    logger.warn('Tentative de sauvegarde avec une clé non autorisée:', key);
    throw new Error('Clé de stockage non autorisée');
  }
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadData(key: string) {
  if (!isValidKey(key)) {
    logger.warn('Tentative de lecture avec une clé non autorisée:', key);
    return null;
  }
  const json = await AsyncStorage.getItem(key);
  return json ? JSON.parse(json) : null;
}

export async function removeData(key: string) {
  if (!isValidKey(key)) {
    logger.warn('Tentative de suppression avec une clé non autorisée:', key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

// List-specific functions
export async function loadLists(): Promise<List[]> {
  const json = await AsyncStorage.getItem(LISTS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveLists(lists: List[]): Promise<void> {
  await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  scheduleExpirationNotifications().catch((e) => logger.error('Erreur notifications:', e.message));
  // Mettre à jour les données du widget
  updateWidgetData().catch((e) => logger.error('Erreur widget data:', e.message));
}

export async function createList(title: string, color?: string, icon?: string): Promise<List> {
  const validation = validateListTitle(title);
  if (!validation.valid) {
    throw new Error(validation.error || 'Titre invalide');
  }

  const lists = await loadLists();
  const newList: List = {
    id: Date.now().toString(),
    title: sanitizeString(title, 50),
    createdAt: new Date().toISOString(),
    items: [],
    color: color || '#3C6E47',
    icon: icon || 'snow-outline',
  };
  lists.push(newList);
  await saveLists(lists);
  logger.info('Nouvelle liste créée:', newList.id);

  // Sync avec le cloud
  await triggerCloudSync('INSERT', 'lists', newList.id, {
    title: newList.title,
    color: newList.color,
    icon: newList.icon,
    local_id: newList.id,
    created_at: newList.createdAt,
  });

  return newList;
}

export async function deleteList(id: string): Promise<void> {
  const lists = await loadLists();
  await saveLists(lists.filter((list) => list.id !== id));

  // Sync avec le cloud
  await triggerCloudSync('DELETE', 'lists', id, {});
}

export async function updateList(id: string, updates: { title?: string; color?: string; icon?: string }): Promise<void> {
  const lists = await loadLists();
  const listIndex = lists.findIndex((list) => list.id === id);
  if (listIndex === -1) {
    throw new Error(`Liste avec l'id ${id} introuvable`);
  }

  const cloudUpdates: Record<string, any> = {};

  if (updates.title !== undefined) {
    const validation = validateListTitle(updates.title);
    if (!validation.valid) {
      throw new Error(validation.error || 'Titre invalide');
    }
    lists[listIndex].title = sanitizeString(updates.title, 50);
    cloudUpdates.title = lists[listIndex].title;
  }

  if (updates.color !== undefined) {
    lists[listIndex].color = updates.color;
    cloudUpdates.color = updates.color;
  }

  if (updates.icon !== undefined) {
    lists[listIndex].icon = updates.icon;
    cloudUpdates.icon = updates.icon;
  }

  await saveLists(lists);
  logger.info('Liste mise à jour:', id);

  // Sync avec le cloud
  if (Object.keys(cloudUpdates).length > 0) {
    await triggerCloudSync('UPDATE', 'lists', id, cloudUpdates);
  }
}

export async function addItemToList(listId: string, item: FoodItem): Promise<void> {
  const { lists, listIndex } = await findListAndItem(listId);
  lists[listIndex].items.push(item);
  await saveLists(lists);

  // Sync avec le cloud
  await triggerCloudSync('INSERT', 'food_items', item.id, {
    list_id: listId,
    name: item.name,
    expiration_date: convertDateForCloud(item.expirationDate),
    quantity: item.quantity ?? 1,
    weight: item.weight ?? null,
    unit: item.unit ?? null,
    category: item.category ?? null,
    image_uri: item.imageUri ?? null,
    price: item.price ?? null,
    status: item.status || 'active',
    is_opened: item.isOpened || false,
    opened_date: convertDateForCloud(item.openedDate),
    days_after_opening: item.daysAfterOpening ?? null,
    local_id: item.id,
  });
}

export async function updateItem(listId: string, itemId: string, updates: Partial<FoodItem>): Promise<void> {
  const { lists, listIndex, itemIndex } = await findListAndItem(listId, itemId);
  const item = lists[listIndex].items[itemIndex!];

  // Mettre à jour les propriétés
  Object.assign(item, updates);

  await saveLists(lists);
  logger.info('Aliment mis à jour:', itemId);

  // Convertir les updates pour le cloud
  const cloudUpdates: Record<string, any> = {};
  if (updates.name !== undefined) cloudUpdates.name = updates.name;
  if (updates.expirationDate !== undefined) cloudUpdates.expiration_date = convertDateForCloud(updates.expirationDate);
  if (updates.quantity !== undefined) cloudUpdates.quantity = updates.quantity;
  if (updates.weight !== undefined) cloudUpdates.weight = updates.weight ?? null;
  if (updates.unit !== undefined) cloudUpdates.unit = updates.unit ?? null;
  if (updates.category !== undefined) cloudUpdates.category = updates.category;
  if (updates.imageUri !== undefined) cloudUpdates.image_uri = updates.imageUri;
  if (updates.price !== undefined) cloudUpdates.price = updates.price;
  if (updates.status !== undefined) cloudUpdates.status = updates.status;
  if (updates.isOpened !== undefined) cloudUpdates.is_opened = updates.isOpened;
  if (updates.openedDate !== undefined) cloudUpdates.opened_date = convertDateForCloud(updates.openedDate);
  if (updates.daysAfterOpening !== undefined) cloudUpdates.days_after_opening = updates.daysAfterOpening;

  // Sync avec le cloud
  if (Object.keys(cloudUpdates).length > 0) {
    await triggerCloudSync('UPDATE', 'food_items', itemId, cloudUpdates);
  }
}

export async function removeItemFromList(listId: string, itemId: string): Promise<void> {
  const { lists, listIndex } = await findListAndItem(listId);
  lists[listIndex].items = lists[listIndex].items.filter((item) => item.id !== itemId);
  await saveLists(lists);

  // Sync avec le cloud
  await triggerCloudSync('DELETE', 'food_items', itemId, {});
}

export async function getListById(listId: string): Promise<List | null> {
  const lists = await loadLists();
  return lists.find((list) => list.id === listId) || null;
}

export async function updateItemStatus(
  listId: string,
  itemId: string,
  status: 'active' | 'consumed' | 'thrown'
): Promise<void> {
  const { lists, listIndex, itemIndex } = await findListAndItem(listId, itemId);
  const item = lists[listIndex].items[itemIndex!];
  item.status = status;

  if (status === 'consumed' || status === 'thrown') {
    item.consumedAt = new Date().toISOString();
  } else {
    item.consumedAt = undefined;
  }

  await saveLists(lists);

  // Sync avec le cloud
  await triggerCloudSync('UPDATE', 'food_items', itemId, {
    status,
    consumed_at: item.consumedAt ?? null,
  });
}

export async function markItemAsOpened(
  listId: string,
  itemId: string,
  openedDate: string,
  daysAfterOpening: number
): Promise<void> {
  const { lists, listIndex, itemIndex } = await findListAndItem(listId, itemId);
  const item = lists[listIndex].items[itemIndex!];

  item.isOpened = true;
  item.openedDate = openedDate;
  item.daysAfterOpening = daysAfterOpening;
  item.expirationDate = calculateOpenedExpirationDate(openedDate, daysAfterOpening);

  await saveLists(lists);

  // Sync avec le cloud
  await triggerCloudSync('UPDATE', 'food_items', itemId, {
    is_opened: true,
    opened_date: convertDateForCloud(openedDate),
    days_after_opening: daysAfterOpening,
    expiration_date: convertDateForCloud(item.expirationDate),
  });
}

export async function updateItemStatusWithQuantity(
  listId: string,
  itemId: string,
  status: 'consumed' | 'thrown',
  quantityToMark: number
): Promise<void> {
  const { lists, listIndex, itemIndex } = await findListAndItem(listId, itemId);
  const item = lists[listIndex].items[itemIndex!];
  const currentQuantity = item.quantity || 1;
  const timestamp = new Date().toISOString();

  if (quantityToMark >= currentQuantity) {
    item.status = status;
    item.consumedAt = timestamp;

    await saveLists(lists);

    // Sync avec le cloud
    await triggerCloudSync('UPDATE', 'food_items', itemId, {
      status,
      consumed_at: timestamp,
    });
  } else {
    const originalPrice = item.price;
    const splitPrice = originalPrice != null
      ? Math.round((originalPrice / currentQuantity) * quantityToMark * 100) / 100
      : undefined;
    const remainingPrice = originalPrice != null
      ? Math.round((originalPrice - (splitPrice ?? 0)) * 100) / 100
      : undefined;

    item.quantity = currentQuantity - quantityToMark;
    if (remainingPrice != null) item.price = remainingPrice;

    const newItemId = `${item.id}-${status}-${Date.now()}`;
    const newItem = {
      ...item,
      id: newItemId,
      quantity: quantityToMark,
      price: splitPrice,
      status,
      consumedAt: timestamp,
    };
    lists[listIndex].items.push(newItem);

    await saveLists(lists);

    // Sync la mise à jour de quantité et prix de l'item original
    await triggerCloudSync('UPDATE', 'food_items', itemId, {
      quantity: item.quantity,
      price: item.price ?? null,
    });

    // Sync le nouvel item créé
    await triggerCloudSync('INSERT', 'food_items', newItemId, {
      list_id: listId,
      name: newItem.name,
      expiration_date: convertDateForCloud(newItem.expirationDate),
      quantity: quantityToMark,
      weight: newItem.weight ?? null,
      unit: newItem.unit ?? null,
      category: newItem.category ?? null,
      image_uri: newItem.imageUri ?? null,
      price: newItem.price ?? null,
      status,
      is_opened: newItem.isOpened || false,
      opened_date: convertDateForCloud(newItem.openedDate),
      days_after_opening: newItem.daysAfterOpening ?? null,
      local_id: newItemId,
      consumed_at: timestamp,
    });
  }
}

export async function markItemAsOpenedWithQuantity(
  listId: string,
  itemId: string,
  openedDate: string,
  daysAfterOpening: number,
  quantityToOpen: number
): Promise<void> {
  const { lists, listIndex, itemIndex } = await findListAndItem(listId, itemId);
  const item = lists[listIndex].items[itemIndex!];
  const currentQuantity = item.quantity || 1;
  const newExpirationDate = calculateOpenedExpirationDate(openedDate, daysAfterOpening);

  if (quantityToOpen >= currentQuantity) {
    item.isOpened = true;
    item.openedDate = openedDate;
    item.daysAfterOpening = daysAfterOpening;
    item.expirationDate = newExpirationDate;

    await saveLists(lists);

    // Sync avec le cloud
    await triggerCloudSync('UPDATE', 'food_items', itemId, {
      is_opened: true,
      opened_date: convertDateForCloud(openedDate),
      days_after_opening: daysAfterOpening,
      expiration_date: convertDateForCloud(newExpirationDate),
    });
  } else {
    const originalPrice = item.price;
    const splitPrice = originalPrice != null
      ? Math.round((originalPrice / currentQuantity) * quantityToOpen * 100) / 100
      : undefined;
    const remainingPrice = originalPrice != null
      ? Math.round((originalPrice - (splitPrice ?? 0)) * 100) / 100
      : undefined;

    item.quantity = currentQuantity - quantityToOpen;
    if (remainingPrice != null) item.price = remainingPrice;

    const newItemId = `${item.id}-opened-${Date.now()}`;
    const newItem = {
      ...item,
      id: newItemId,
      quantity: quantityToOpen,
      price: splitPrice,
      isOpened: true,
      openedDate,
      daysAfterOpening,
      expirationDate: newExpirationDate,
    };
    lists[listIndex].items.push(newItem);

    await saveLists(lists);

    // Sync la mise à jour de quantité et prix de l'item original
    await triggerCloudSync('UPDATE', 'food_items', itemId, {
      quantity: item.quantity,
      price: item.price ?? null,
    });

    // Sync le nouvel item créé
    await triggerCloudSync('INSERT', 'food_items', newItemId, {
      list_id: listId,
      name: newItem.name,
      expiration_date: convertDateForCloud(newExpirationDate),
      quantity: quantityToOpen,
      weight: newItem.weight ?? null,
      unit: newItem.unit ?? null,
      category: newItem.category ?? null,
      image_uri: newItem.imageUri ?? null,
      price: newItem.price ?? null,
      status: newItem.status || 'active',
      is_opened: true,
      opened_date: convertDateForCloud(openedDate),
      days_after_opening: daysAfterOpening,
      local_id: newItemId,
    });
  }
}

// Export pour permettre une sync manuelle depuis l'UI
export { syncWithCloud } from '../services/supabase/syncService';
