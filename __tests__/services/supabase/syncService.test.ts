// ============================================
// FILE DE SYNCHRONISATION CLOUD
// services/supabase/syncService.ts (568 lignes) etait a 0% de couverture alors
// que c'est le seul endroit ou une modification locale peut disparaitre
// silencieusement avant d'atteindre le cloud.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: (o: any) => o.ios } }));

// Faux client Supabase chainable : chaque appel .from() renvoie un objet dont
// toutes les methodes se chainent, et qui se resout sur le resultat configure.
type Result = { data?: unknown; error?: unknown };
const results: Record<string, Result> = {};
const calls: { table: string; method: string; arg: unknown }[] = [];

function makeQuery(table: string) {
  // Le resultat est configurable par table ET par operation ('lists:update'),
  // sinon faire echouer un push ferait aussi echouer le pull qui lit la meme table.
  const used = new Set<string>();
  const result = (): Result => {
    for (const op of ['insert', 'update', 'delete', 'select']) {
      if (used.has(op) && results[`${table}:${op}`]) return results[`${table}:${op}`];
    }
    return results[table] ?? { data: [], error: null };
  };
  const query: Record<string, unknown> = {
    then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(res, rej),
  };
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gt', 'neq', 'order', 'limit']) {
    query[method] = jest.fn((arg?: unknown) => {
      used.add(method);
      calls.push({ table, method, arg });
      return query;
    });
  }
  return query;
}

jest.mock('../../../config/supabase', () => ({
  supabase: { from: jest.fn((table: string) => makeQuery(table)) },
}));

import {
  addToSyncQueue,
  getPendingChangesCount,
  convertCloudItemToLocal,
  syncWithCloud,
} from '../../../services/supabase/syncService';

const USER = 'user-1';
const QUEUE_KEY = `supabase_sync_queue_${USER}`;

const store: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  for (const k of Object.keys(results)) delete results[k];
  calls.length = 0;

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

const queue = (): any[] => (store[QUEUE_KEY] ? JSON.parse(store[QUEUE_KEY]) : []);
const setQueue = (items: unknown[]) => {
  store[QUEUE_KEY] = JSON.stringify(items);
};

describe('addToSyncQueue', () => {
  it('empile une operation avec un compteur de reessais a zero', async () => {
    await addToSyncQueue(USER, 'INSERT', 'lists', 'list-1', { title: 'Frigo' });

    expect(queue()).toHaveLength(1);
    expect(queue()[0]).toMatchObject({
      operation: 'INSERT',
      tableName: 'lists',
      localId: 'list-1',
      retryCount: 0,
    });
  });

  it('fusionne deux UPDATE sur la meme cible au lieu de les empiler', async () => {
    await addToSyncQueue(USER, 'UPDATE', 'food_items', 'item-1', { quantity: 3 });
    await addToSyncQueue(USER, 'UPDATE', 'food_items', 'item-1', { status: 'consumed' });

    expect(queue()).toHaveLength(1);
    // Le second ne doit pas ecraser le premier : les deux champs partent au cloud.
    expect(queue()[0].payload).toEqual({ quantity: 3, status: 'consumed' });
  });

  it('ne fusionne pas des UPDATE sur des cibles differentes', async () => {
    await addToSyncQueue(USER, 'UPDATE', 'food_items', 'item-1', { quantity: 1 });
    await addToSyncQueue(USER, 'UPDATE', 'food_items', 'item-2', { quantity: 2 });
    await addToSyncQueue(USER, 'UPDATE', 'lists', 'item-1', { title: 'X' });

    expect(queue()).toHaveLength(3);
  });

  it('n empile jamais un INSERT sur un UPDATE existant', async () => {
    await addToSyncQueue(USER, 'UPDATE', 'lists', 'list-1', { title: 'A' });
    await addToSyncQueue(USER, 'INSERT', 'lists', 'list-1', { title: 'B' });

    expect(queue().map((q) => q.operation)).toEqual(['UPDATE', 'INSERT']);
  });

  it('compte les changements en attente', async () => {
    expect(await getPendingChangesCount(USER)).toBe(0);
    await addToSyncQueue(USER, 'INSERT', 'lists', 'list-1', {});
    await addToSyncQueue(USER, 'DELETE', 'lists', 'list-2', {});
    expect(await getPendingChangesCount(USER)).toBe(2);
  });
});

describe('convertCloudItemToLocal', () => {
  const cloud = {
    id: 'uuid-cloud',
    local_id: '1787000000000',
    name: 'Yaourt',
    expiration_date: '2026-08-27',
    quantity: 4,
    status: 'active',
  } as any;

  it('prefere le local_id a l UUID cloud', () => {
    expect(convertCloudItemToLocal(cloud).id).toBe('1787000000000');
  });

  it('retombe sur l UUID quand il n y a pas de local_id', () => {
    expect(convertCloudItemToLocal({ ...cloud, local_id: null }).id).toBe('uuid-cloud');
  });

  it('reconvertit la date ISO au format affiche', () => {
    expect(convertCloudItemToLocal(cloud).expirationDate).toBe('27/08/2026');
  });

  it('rend une date vide quand le cloud n en a pas', () => {
    expect(convertCloudItemToLocal({ ...cloud, expiration_date: null }).expirationDate).toBe('');
  });

  it('traduit les null du cloud en undefined', () => {
    const local = convertCloudItemToLocal({ ...cloud, unit: null, price: null, category: null });
    expect(local.unit).toBeUndefined();
    expect(local.price).toBeUndefined();
    expect(local.category).toBeUndefined();
    expect(local.isOpened).toBe(false);
  });
});

describe('envoi de la file vers le cloud', () => {
  it('vide la file quand tout passe', async () => {
    setQueue([
      { id: '1', operation: 'UPDATE', tableName: 'lists', localId: 'l1',
        payload: { title: 'A' }, createdAt: '', retryCount: 0 },
    ]);

    await syncWithCloud(USER);

    expect(queue()).toHaveLength(0);
  });

  it('reessaie une operation en echec en incrementant le compteur', async () => {
    results['lists:update'] = { data: null, error: { message: 'offline' } };
    setQueue([
      { id: '1', operation: 'UPDATE', tableName: 'lists', localId: 'l1',
        payload: { title: 'A' }, createdAt: '', retryCount: 0 },
    ]);

    await syncWithCloud(USER);

    expect(queue()).toHaveLength(1);
    expect(queue()[0].retryCount).toBe(1);
  });

  it('abandonne definitivement apres 3 reessais (perte assumee)', async () => {
    results['lists:update'] = { data: null, error: { message: 'offline' } };
    setQueue([
      { id: '1', operation: 'UPDATE', tableName: 'lists', localId: 'l1',
        payload: { title: 'A' }, createdAt: '', retryCount: 3 },
    ]);

    await syncWithCloud(USER);

    // Comportement voulu, mais c'est bien une modification locale perdue :
    // ce test existe pour qu'on ne change pas ce seuil sans s'en rendre compte.
    expect(queue()).toHaveLength(0);
  });

  it('ne tente pas le pull tant que la file n est pas vide', async () => {
    results['lists:update'] = { data: null, error: { message: 'offline' } };
    setQueue([
      { id: '1', operation: 'UPDATE', tableName: 'lists', localId: 'l1',
        payload: { title: 'A' }, createdAt: '', retryCount: 0 },
    ]);

    await syncWithCloud(USER);

    // Le pull interroge list_shares : son absence prouve qu'il a ete reporte.
    expect(calls.some((c) => c.table === 'list_shares')).toBe(false);
  });

  it('jette un aliment orphelin dont la liste n existe plus au lieu de boucler', async () => {
    // Aucun mapping local_id -> UUID renvoye (defaut du mock) : la liste a
    // disparu du cloud.
    setQueue([
      { id: '1', operation: 'INSERT', tableName: 'food_items', localId: 'i1',
        payload: { list_id: '1787000000000', name: 'Yaourt' }, createdAt: '', retryCount: 0 },
    ]);

    await syncWithCloud(USER);

    expect(queue()).toHaveLength(0);
    expect(calls.some((c) => c.table === 'food_items' && c.method === 'insert')).toBe(false);
  });
});
