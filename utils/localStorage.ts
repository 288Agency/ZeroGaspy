import AsyncStorage from '@react-native-async-storage/async-storage';
import { List, FoodItem } from '../types';
import { scheduleExpirationNotifications } from '../services/notificationService';
import { sanitizeString, validateListTitle } from './security';
import { formatDateToDDMMYYYY, parseDDMMYYYY } from './dateUtils';
import logger from './logger';

const LISTS_KEY = 'inventory_lists';
const ALLOWED_KEYS = [LISTS_KEY, 'notification_settings', 'last_notification_check'];

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
}

export async function createList(title: string, color?: string): Promise<List> {
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
  };
  lists.push(newList);
  await saveLists(lists);
  logger.info('Nouvelle liste créée:', newList.id);
  return newList;
}

export async function deleteList(id: string): Promise<void> {
  const lists = await loadLists();
  await saveLists(lists.filter((list) => list.id !== id));
}

export async function updateList(id: string, updates: { title?: string; color?: string }): Promise<void> {
  const lists = await loadLists();
  const listIndex = lists.findIndex((list) => list.id === id);
  if (listIndex === -1) {
    throw new Error(`Liste avec l'id ${id} introuvable`);
  }

  if (updates.title !== undefined) {
    const validation = validateListTitle(updates.title);
    if (!validation.valid) {
      throw new Error(validation.error || 'Titre invalide');
    }
    lists[listIndex].title = sanitizeString(updates.title, 50);
  }

  if (updates.color !== undefined) {
    lists[listIndex].color = updates.color;
  }

  await saveLists(lists);
  logger.info('Liste mise à jour:', id);
}

export async function addItemToList(listId: string, item: FoodItem): Promise<void> {
  const { lists, listIndex } = await findListAndItem(listId);
  lists[listIndex].items.push(item);
  await saveLists(lists);
}

export async function removeItemFromList(listId: string, itemId: string): Promise<void> {
  const { lists, listIndex } = await findListAndItem(listId);
  lists[listIndex].items = lists[listIndex].items.filter((item) => item.id !== itemId);
  await saveLists(lists);
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

  // Ajouter timestamp quand l'item est consommé ou jeté (pour calcul économies)
  if (status === 'consumed' || status === 'thrown') {
    item.consumedAt = new Date().toISOString();
  }

  await saveLists(lists);
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
  } else {
    item.quantity = currentQuantity - quantityToMark;
    lists[listIndex].items.push({
      ...item,
      id: `${item.id}-${status}-${Date.now()}`,
      quantity: quantityToMark,
      status,
      consumedAt: timestamp,
    });
  }

  await saveLists(lists);
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
  } else {
    item.quantity = currentQuantity - quantityToOpen;
    lists[listIndex].items.push({
      ...item,
      id: `${item.id}-opened-${Date.now()}`,
      quantity: quantityToOpen,
      isOpened: true,
      openedDate,
      daysAfterOpening,
      expirationDate: newExpirationDate,
    });
  }

  await saveLists(lists);
}
