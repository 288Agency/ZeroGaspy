/**
 * Le widget Android tourne dans un contexte JS headless dont le point d'entrée
 * est widgetTaskHandler, pas App.tsx. Ces tests chargent donc les modules dans
 * cet ordre-là, sur un registre neuf.
 */
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
}));
jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(() => Promise.resolve()),
  registerWidgetTaskHandler: jest.fn(),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  ListWidget: 'ListWidget',
}));
jest.mock('../../config/supabase', () => ({
  supabase: { auth: { getUser: jest.fn(() => Promise.resolve({ data: { user: null } })) } },
}));
jest.mock('../../services/supabase/syncService', () => ({
  addToSyncQueue: jest.fn(() => Promise.resolve()),
  syncWithCloud: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/notificationService', () => ({
  scheduleExpirationNotifications: jest.fn(() => Promise.resolve()),
  refreshLocalSecondaryNotifications: jest.fn(() => Promise.resolve()),
}));

/** DD/MM/YYYY, le format réellement stocké (cf. formatDateToDDMMYYYY). */
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

const LISTS = [
  {
    id: '1',
    title: 'Frigo',
    items: [
      { id: 'a', name: 'Yaourt', expirationDate: inDays(2), status: 'active' },
      { id: 'b', name: 'Salade', expirationDate: inDays(-1), status: 'active' },
      { id: 'c', name: 'Riz', expirationDate: inDays(300), status: 'active' },
      { id: 'd', name: 'Pain', expirationDate: inDays(1), status: 'consumed' },
    ],
  },
];

const CACHE_KEY = '@zerogaspy_widget_data';

/**
 * jest.isolateModules repart d'un registre neuf : le mock AsyncStorage y est
 * réinstancié. Il faut donc le configurer DANS le registre isolé, sinon on
 * teste un stockage vide et tout retourne [] pour de mauvaises raisons.
 */
function loadHeadless(storageContents: Record<string, string | null>) {
  let service!: typeof import('../../widgets/widgetDataService');
  let handler!: typeof import('../../widgets/widgetTaskHandler');
  jest.isolateModules(() => {
    const storage = require('@react-native-async-storage/async-storage');
    storage.getItem.mockImplementation((key: string) =>
      Promise.resolve(storageContents[key] ?? null),
    );
    handler = require('../../widgets/widgetTaskHandler');
    service = require('../../widgets/widgetDataService');
  });
  return { service, handler };
}

const withLists = { inventory_lists: JSON.stringify(LISTS) };

describe('widget Android — données', () => {
  it('remonte les aliments bientôt périmés, du plus urgent au moins urgent', async () => {
    const { service } = loadHeadless(withLists);

    const foods = await service.getExpiringFoods(service.WIDGET_HORIZON_DAYS);

    expect(foods.map((f) => f.name)).toEqual(['Salade', 'Yaourt']);
    expect(foods[0].daysLeft).toBe(-1);
    expect(foods[0].listName).toBe('Frigo');
  });

  it('remonte une erreur de stockage au lieu de la faire passer pour un frigo vide', async () => {
    let service!: typeof import('../../widgets/widgetDataService');
    jest.isolateModules(() => {
      const storage = require('@react-native-async-storage/async-storage');
      storage.getItem.mockImplementation(() => Promise.reject(new Error('storage HS')));
      service = require('../../widgets/widgetDataService');
    });

    await expect(service.getExpiringFoods(7)).rejects.toThrow('storage HS');
  });

  it('getWidgetData répond null quand il n y a pas de cache', async () => {
    const { service } = loadHeadless(withLists);

    // Sans ce null, le repli de l'appelant est du code mort.
    await expect(service.getWidgetData()).resolves.toBeNull();
  });
});

describe('widget Android — rendu du handler', () => {
  function renderedWith(storageContents: Record<string, string | null>) {
    const { handler } = loadHeadless(storageContents);
    const renderWidget = jest.fn();
    return {
      renderWidget,
      run: () =>
        handler.widgetTaskHandler({
          widgetAction: 'WIDGET_UPDATE',
          widgetInfo: { widgetName: 'ExpiringFoods' },
          renderWidget,
        } as any),
    };
  }

  it('ignore un cache périmé et recalcule l inventaire réel', async () => {
    // Le cas vécu : cache écrit alors que le frigo était vide, jamais réécrit.
    const { renderWidget, run } = renderedWith({
      ...withLists,
      [CACHE_KEY]: JSON.stringify({ expiringFoods: [], lastUpdated: '2020-01-01' }),
    });

    await run();

    expect(renderWidget).toHaveBeenCalledTimes(1);
    const names = renderWidget.mock.calls[0][0].props.expiringFoods.map((f: any) => f.name);
    expect(names).toEqual(['Salade', 'Yaourt']);
  });

  it('retombe sur le cache quand le stockage est illisible', async () => {
    let handler!: typeof import('../../widgets/widgetTaskHandler');
    jest.isolateModules(() => {
      const storage = require('@react-native-async-storage/async-storage');
      storage.getItem.mockImplementation((key: string) =>
        key === CACHE_KEY
          ? Promise.resolve(JSON.stringify({ expiringFoods: [{ name: 'Yaourt', daysLeft: 1, listName: 'Frigo' }], lastUpdated: 'x' }))
          : Promise.reject(new Error('storage HS')),
      );
      handler = require('../../widgets/widgetTaskHandler');
    });
    const renderWidget = jest.fn();

    await handler.widgetTaskHandler({
      widgetAction: 'WIDGET_UPDATE',
      widgetInfo: { widgetName: 'ExpiringFoods' },
      renderWidget,
    } as any);

    const names = renderWidget.mock.calls[0][0].props.expiringFoods.map((f: any) => f.name);
    expect(names).toEqual(['Yaourt']);
  });
});

describe('widget Android — arbre de rendu', () => {
  function collectTypes(node: any, out: string[] = []): string[] {
    if (Array.isArray(node)) {
      node.forEach((n) => collectTypes(n, out));
      return out;
    }
    if (!node || typeof node !== 'object') return out;
    if (typeof node.type === 'string') out.push(node.type);
    if (typeof node.type === 'function') return collectTypes(node.type(node.props), out);
    if (node.props?.children) collectTypes(node.props.children, out);
    return out;
  }

  it('n utilise pas ListWidget, qui fait disparaître le widget sur device', () => {
    let mod!: typeof import('../../widgets/ExpiringFoodsWidget');
    jest.isolateModules(() => {
      mod = require('../../widgets/ExpiringFoodsWidget');
    });

    const tree = mod.ExpiringFoodsWidget({
      expiringFoods: [
        { name: 'Salade', daysLeft: -1, listName: 'Frigo' },
        { name: 'Yaourt', daysLeft: 2, listName: 'Frigo' },
      ],
    });

    const types = collectTypes(tree);
    expect(types).toContain('FlexWidget');
    expect(types).not.toContain('ListWidget');
  });
});
