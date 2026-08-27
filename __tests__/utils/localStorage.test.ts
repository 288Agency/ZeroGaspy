// ============================================
// COUCHE DONNEES LOCALE
// utils/localStorage.ts est le socle de l'app (listes, aliments, statuts,
// consommation partielle). Il etait a 0% de couverture alors que toutes les
// stats € et les compteurs d'ecran en dependent.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem } from '../../types';

// Le setup global mocke localStorage pour les autres suites : ici on teste le vrai.
jest.unmock('../../utils/localStorage');

jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: (o: any) => o.ios } }));
jest.mock('../../services/notificationService', () => ({
  scheduleExpirationNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/supabase/syncService', () => ({
  addToSyncQueue: jest.fn(() => Promise.resolve()),
  syncWithCloud: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../config/supabase', () => ({
  supabase: { auth: { getUser: jest.fn(() => Promise.resolve({ data: { user: null } })) } },
}));
jest.mock('../../widgets/widgetDataService', () => ({
  updateWidgetData: jest.fn(() => Promise.resolve()),
}));

import {
  loadLists,
  createList,
  deleteList,
  addItemToList,
  updateItem,
  removeItemFromList,
  getListById,
  updateItemStatus,
  markItemConsumed,
  markItemThrown,
  restoreItem,
  updateItemStatusWithQuantity,
} from '../../utils/localStorage';

// AsyncStorage persistant en memoire : sans ca, chaque lecture renvoie null et
// les tests ne verifieraient jamais un vrai aller-retour d'ecriture/lecture.
const store: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  const AS = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  AS.getItem.mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
  AS.setItem.mockImplementation((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  });
  AS.removeItem.mockImplementation((k: string) => {
    delete store[k];
    return Promise.resolve();
  });
});

const makeItem = (over: Partial<FoodItem> = {}): FoodItem =>
  ({
    id: 'item-1',
    name: 'Yaourt nature',
    expirationDate: '27/08/2026',
    quantity: 4,
    unit: 'pots',
    category: 'dairy',
    status: 'active',
    ...over,
  }) as FoodItem;

describe('listes', () => {
  it('cree une liste et la relit apres ecriture', async () => {
    const list = await createList('Mon frigo');

    const reloaded = await loadLists();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe(list.id);
    expect(reloaded[0].title).toBe('Mon frigo');
    expect(reloaded[0].items).toEqual([]);
  });

  it('retourne une liste vide quand rien n est stocke', async () => {
    expect(await loadLists()).toEqual([]);
  });

  it('supprime une liste sans toucher aux autres', async () => {
    const a = await createList('Frigo');
    const b = await createList('Congelo');

    await deleteList(a.id);

    const remaining = await loadLists();
    expect(remaining.map((l) => l.id)).toEqual([b.id]);
  });

  it('donne des ids distincts a deux listes creees dans la meme milliseconde', async () => {
    // Regression : l'id venait de Date.now() seul, donc deux listes creees coup
    // sur coup partageaient le meme id et deleteList les supprimait toutes les deux.
    const fixed = 1_787_000_000_000;
    const spy = jest.spyOn(Date, 'now').mockReturnValue(fixed);
    try {
      const a = await createList('Frigo');
      const b = await createList('Congelo');
      const c = await createList('Placard');
      expect(new Set([a.id, b.id, c.id]).size).toBe(3);
      // ...et l'id reste purement numerique : la sync distingue local/cloud au tiret.
      for (const id of [a.id, b.id, c.id]) expect(id).toMatch(/^\d+$/);
    } finally {
      spy.mockRestore();
    }
  });

  it('retrouve une liste par id, et null si absente', async () => {
    const list = await createList('Frigo');
    expect((await getListById(list.id))?.title).toBe('Frigo');
    expect(await getListById('inexistant')).toBeNull();
  });
});

describe('aliments', () => {
  it('ajoute un aliment et le relit', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());

    const stored = await getListById(list.id);
    expect(stored?.items).toHaveLength(1);
    expect(stored?.items[0]).toMatchObject({ name: 'Yaourt nature', quantity: 4 });
  });

  it('met a jour un aliment sans ecraser les champs non fournis', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());

    await updateItem(list.id, 'item-1', { quantity: 2 });

    const item = (await getListById(list.id))!.items[0];
    expect(item.quantity).toBe(2);
    expect(item.name).toBe('Yaourt nature');
    expect(item.unit).toBe('pots');
  });

  it('retire un aliment de la liste', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());
    await addItemToList(list.id, makeItem({ id: 'item-2', name: 'Lait' }));

    await removeItemFromList(list.id, 'item-1');

    const items = (await getListById(list.id))!.items;
    expect(items.map((i) => i.id)).toEqual(['item-2']);
  });

  it('leve une erreur explicite sur une liste ou un aliment inconnu', async () => {
    const list = await createList('Frigo');
    await expect(addItemToList('nope', makeItem())).rejects.toThrow(/introuvable/);
    await expect(updateItem(list.id, 'nope', { quantity: 1 })).rejects.toThrow(/introuvable/);
  });
});

describe('statuts', () => {
  it('marque consomme et horodate', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());

    await markItemConsumed(list.id, 'item-1');

    const item = (await getListById(list.id))!.items[0];
    expect(item.status).toBe('consumed');
    expect(item.consumedAt).toBeTruthy();
  });

  it('marque jete et horodate', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());

    await markItemThrown(list.id, 'item-1');

    const item = (await getListById(list.id))!.items[0];
    expect(item.status).toBe('thrown');
    expect(item.consumedAt).toBeTruthy();
  });

  it('restaurer un aliment efface la date de consommation', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());
    await markItemConsumed(list.id, 'item-1');

    await restoreItem(list.id, 'item-1');

    const item = (await getListById(list.id))!.items[0];
    expect(item.status).toBe('active');
    expect(item.consumedAt).toBeUndefined();
  });

  it('conserve l aliment en base une fois consomme (les stats en dependent)', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem());
    await updateItemStatus(list.id, 'item-1', 'consumed');

    expect((await getListById(list.id))!.items).toHaveLength(1);
  });
});

describe('consommation partielle', () => {
  it('scinde l aliment en gardant le reste actif', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem({ quantity: 4 }));

    await updateItemStatusWithQuantity(list.id, 'item-1', 'consumed', 1);

    const items = (await getListById(list.id))!.items;
    expect(items).toHaveLength(2);

    const original = items.find((i) => i.id === 'item-1')!;
    const split = items.find((i) => i.id !== 'item-1')!;

    expect(original.quantity).toBe(3);
    expect(original.status).toBe('active');
    expect(split.quantity).toBe(1);
    expect(split.status).toBe('consumed');
  });

  it('repartit le prix sans perdre ni inventer de centimes', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem({ quantity: 3, price: 2.5 }));

    await updateItemStatusWithQuantity(list.id, 'item-1', 'consumed', 1);

    const items = (await getListById(list.id))!.items;
    const original = items.find((i) => i.id === 'item-1')!;
    const split = items.find((i) => i.id !== 'item-1')!;

    // 2.50 / 3 = 0.8333… -> 0.83 consomme, 1.67 restant : le total doit tenir.
    expect(split.price).toBeCloseTo(0.83, 2);
    expect(original.price).toBeCloseTo(1.67, 2);
    expect((split.price ?? 0) + (original.price ?? 0)).toBeCloseTo(2.5, 2);
  });

  it('ne scinde pas quand la quantite couvre tout le stock', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem({ quantity: 2 }));

    await updateItemStatusWithQuantity(list.id, 'item-1', 'consumed', 2);

    const items = (await getListById(list.id))!.items;
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('consumed');
    expect(items[0].quantity).toBe(2);
  });

  it('traite un aliment sans quantite comme une unite', async () => {
    const list = await createList('Frigo');
    await addItemToList(list.id, makeItem({ quantity: undefined }));

    await updateItemStatusWithQuantity(list.id, 'item-1', 'thrown', 1);

    const items = (await getListById(list.id))!.items;
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('thrown');
  });
});
