import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, CloudList, CloudFoodItem } from '../../config/supabase';
import { List, FoodItem } from '../../types';
import logger from '../../utils/logger';

const MIGRATION_KEY = 'supabase_data_migrated';
const LAST_SYNC_KEY = 'supabase_last_sync';
const SYNC_QUEUE_KEY = 'supabase_sync_queue';

interface SyncQueueItem {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: 'lists' | 'food_items';
  localId: string;
  payload: any;
  createdAt: string;
  retryCount: number;
}

// ============================================
// MIGRATION LOCALE -> CLOUD
// ============================================

/**
 * Migre les donnees locales vers Supabase lors de la premiere connexion
 */
export async function migrateLocalDataToCloud(userId: string): Promise<void> {
  try {
    // Verifier si deja migre
    const migrated = await AsyncStorage.getItem(`${MIGRATION_KEY}_${userId}`);
    if (migrated === 'true') {
      logger.debug('Donnees deja migrees vers le cloud');
      return;
    }

    // Charger les listes locales
    const listsJson = await AsyncStorage.getItem('inventory_lists');
    if (!listsJson) {
      await AsyncStorage.setItem(`${MIGRATION_KEY}_${userId}`, 'true');
      return;
    }

    const localLists: List[] = JSON.parse(listsJson);
    if (localLists.length === 0) {
      await AsyncStorage.setItem(`${MIGRATION_KEY}_${userId}`, 'true');
      return;
    }

    logger.debug(`Migration de ${localLists.length} listes vers le cloud...`);

    // Migrer chaque liste
    for (const localList of localLists) {
      try {
        // Inserer la liste dans Supabase
        const { data: cloudList, error: listError } = await supabase
          .from('lists')
          .insert({
            user_id: userId,
            title: localList.title,
            color: localList.color || '#3C6E47',
            icon: localList.icon || 'snow-outline',
            local_id: localList.id,
            created_at: localList.createdAt || new Date().toISOString(),
          })
          .select()
          .single();

        if (listError) {
          logger.error('Erreur migration liste:', listError);
          continue;
        }

        // Migrer les items de la liste
        if (localList.items && localList.items.length > 0) {
          const itemsToInsert = localList.items
            .filter(item => item.name && item.expirationDate)
            .map(item => ({
              list_id: cloudList.id,
              user_id: userId,
              name: item.name,
              expiration_date: convertDateToISO(item.expirationDate),
              quantity: item.quantity || 1,
              weight: item.weight || null,
              unit: item.unit || null,
              category: item.category || null,
              image_uri: item.imageUri || null,
              price: item.price || null,
              status: item.status || 'active',
              is_opened: item.isOpened || false,
              opened_date: item.openedDate ? convertDateToISO(item.openedDate) : null,
              days_after_opening: item.daysAfterOpening || null,
              local_id: item.id,
            }));

          if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
              .from('food_items')
              .insert(itemsToInsert);

            if (itemsError) {
              logger.error('Erreur migration items:', itemsError);
            }
          }
        }

        logger.debug(`Liste "${localList.title}" migree avec succes`);
      } catch (error) {
        logger.error(`Erreur migration liste ${localList.title}:`, error);
      }
    }

    await AsyncStorage.setItem(`${MIGRATION_KEY}_${userId}`, 'true');
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    logger.debug('Migration vers cloud terminee');
  } catch (error) {
    logger.error('Erreur migration globale:', error);
    throw error;
  }
}

// ============================================
// SYNCHRONISATION BIDIRECTIONNELLE
// ============================================

/**
 * Synchronise les donnees entre local et cloud
 */
export async function syncWithCloud(userId: string): Promise<void> {
  try {
    // 1. Envoyer les changements locaux en attente
    await pushPendingChanges(userId);

    // 2. Recuperer les donnees du cloud
    await pullFromCloud(userId);

    // 3. Mettre a jour le timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    logger.error('Erreur synchronisation:', error);
    throw error;
  }
}

/**
 * Convertit un ID local de liste en UUID cloud
 */
async function getCloudListId(localListId: string): Promise<string | null> {
  // Si c'est déjà un UUID, le retourner directement
  if (localListId.includes('-') && localListId.length === 36) {
    return localListId;
  }

  // Chercher l'UUID cloud correspondant au local_id
  const { data } = await supabase
    .from('lists')
    .select('id')
    .or(`local_id.eq.${localListId},id.eq.${localListId}`)
    .single();

  return data?.id || null;
}

/**
 * Envoie les changements en attente vers le cloud
 */
async function pushPendingChanges(userId: string): Promise<void> {
  const queueJson = await AsyncStorage.getItem(`${SYNC_QUEUE_KEY}_${userId}`);
  if (!queueJson) return;

  const queue: SyncQueueItem[] = JSON.parse(queueJson);
  const failedItems: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      switch (item.operation) {
        case 'INSERT':
          // Pour les food_items, convertir list_id local en UUID cloud
          let payload = { ...item.payload, user_id: userId };
          if (item.tableName === 'food_items' && payload.list_id) {
            const cloudListId = await getCloudListId(payload.list_id);
            if (!cloudListId) {
              // La liste n'existe plus, supprimer cet item de la queue (ne pas réessayer)
              logger.debug(`[SYNC] Liste introuvable, item orphelin supprimé: ${payload.list_id}`);
              continue; // Ne pas ajouter aux failedItems = supprimé de la queue
            }
            payload.list_id = cloudListId;
          }
          const { error: insertError } = await supabase.from(item.tableName).insert(payload);
          if (insertError) {
            logger.error(`[SYNC] Erreur insertion ${item.tableName}:`, insertError);
          }
          break;

        case 'UPDATE':
          await supabase
            .from(item.tableName)
            .update(item.payload)
            .eq('local_id', item.localId);
          break;

        case 'DELETE':
          await supabase
            .from(item.tableName)
            .update({ is_deleted: true })
            .eq('local_id', item.localId);
          break;
      }
    } catch (error) {
      logger.error(`Erreur sync item ${item.id}:`, error);
      if (item.retryCount < 3) {
        failedItems.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }
  }

  // Garder les items echoues pour reessayer
  if (failedItems.length > 0) {
    await AsyncStorage.setItem(`${SYNC_QUEUE_KEY}_${userId}`, JSON.stringify(failedItems));
  } else {
    await AsyncStorage.removeItem(`${SYNC_QUEUE_KEY}_${userId}`);
  }
}

/**
 * Recupere les donnees du cloud vers le local
 */
async function pullFromCloud(userId: string): Promise<void> {
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  // 1. Recuperer les listes personnelles du cloud
  let query = supabase
    .from('lists')
    .select(`
      *,
      food_items (*)
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false);

  // Si on a une derniere sync, ne recuperer que les modifications
  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  }

  const { data: cloudLists, error } = await query;

  logger.debug(`[SYNC] Listes récupérées: ${cloudLists?.length || 0}`,
    cloudLists?.map(l => ({ id: l.id, title: l.title })));

  if (error) {
    logger.error('[SYNC] Erreur récupération listes:', error);
    throw error;
  }

  const allCloudLists = cloudLists || [];

  logger.debug(`[SYNC] Total listes à synchroniser: ${allCloudLists.length}`);

  if (allCloudLists.length === 0) {
    logger.debug('[SYNC] Aucune liste à synchroniser');
    return;
  }

  // Charger les listes locales
  const listsJson = await AsyncStorage.getItem('inventory_lists');
  const localLists: List[] = listsJson ? JSON.parse(listsJson) : [];

  // Fusionner les donnees cloud avec les locales
  for (const cloudList of allCloudLists) {
    const listId = cloudList.local_id || cloudList.id;

    const localIndex = localLists.findIndex(
      l => l.id === cloudList.local_id || l.id === cloudList.id
    );

    const convertedList: List = {
      id: listId,
      title: cloudList.title,
      color: cloudList.color,
      icon: cloudList.icon || 'snow-outline',
      createdAt: cloudList.created_at,
      items: (cloudList.food_items || [])
        .filter((item: CloudFoodItem) => !item.is_deleted)
        .map((item: CloudFoodItem) => convertCloudItemToLocal(item)),
    };

    if (localIndex >= 0) {
      localLists[localIndex] = convertedList;
    } else {
      localLists.push(convertedList);
    }
  }

  // Sauvegarder localement
  await AsyncStorage.setItem('inventory_lists', JSON.stringify(localLists));
}

// ============================================
// QUEUE DE SYNCHRONISATION OFFLINE
// ============================================

/**
 * Ajoute une operation a la queue de sync
 */
export async function addToSyncQueue(
  userId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: 'lists' | 'food_items',
  localId: string,
  payload: any
): Promise<void> {
  const queueJson = await AsyncStorage.getItem(`${SYNC_QUEUE_KEY}_${userId}`);
  const queue: SyncQueueItem[] = queueJson ? JSON.parse(queueJson) : [];

  // Eviter les doublons pour les updates
  if (operation === 'UPDATE') {
    const existingIndex = queue.findIndex(
      item => item.localId === localId && item.tableName === tableName
    );
    if (existingIndex >= 0) {
      queue[existingIndex].payload = { ...queue[existingIndex].payload, ...payload };
      queue[existingIndex].createdAt = new Date().toISOString();
    } else {
      queue.push({
        id: Date.now().toString(),
        operation,
        tableName,
        localId,
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
    }
  } else {
    queue.push({
      id: Date.now().toString(),
      operation,
      tableName,
      localId,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  }

  await AsyncStorage.setItem(`${SYNC_QUEUE_KEY}_${userId}`, JSON.stringify(queue));
}

/**
 * Retourne le nombre de changements en attente
 */
export async function getPendingChangesCount(userId: string): Promise<number> {
  const queueJson = await AsyncStorage.getItem(`${SYNC_QUEUE_KEY}_${userId}`);
  if (!queueJson) return 0;
  const queue: SyncQueueItem[] = JSON.parse(queueJson);
  return queue.length;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Convertit une date DD/MM/YYYY en format ISO (YYYY-MM-DD)
 */
function convertDateToISO(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Si deja au format ISO
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr;
  }

  // Format DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Convertit une date ISO en format DD/MM/YYYY
 */
function convertISOToDate(isoStr: string): string {
  if (!isoStr) return '';

  const date = new Date(isoStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Convertit un item cloud en format local
 */
function convertCloudItemToLocal(item: CloudFoodItem): FoodItem {
  return {
    id: item.local_id || item.id,
    name: item.name,
    expirationDate: convertISOToDate(item.expiration_date),
    quantity: item.quantity,
    weight: item.weight || undefined,
    unit: item.unit || undefined,
    category: item.category || undefined,
    imageUri: item.image_uri || undefined,
    price: item.price || undefined,
    status: item.status,
    isOpened: item.is_opened,
    openedDate: item.opened_date ? convertISOToDate(item.opened_date) : undefined,
    daysAfterOpening: item.days_after_opening || undefined,
  };
}
