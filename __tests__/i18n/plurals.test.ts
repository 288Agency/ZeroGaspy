import fs from 'fs';
import path from 'path';
import i18next from 'i18next';
import fr from '../../i18n/locales/fr.json';
import en from '../../i18n/locales/en.json';

beforeAll(async () => {
  await i18next.init({
    lng: 'fr',
    fallbackLng: 'fr',
    compatibilityJSON: 'v4',
    resources: { fr: { translation: fr }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

describe('pluriels i18next', () => {
  it('accorde les aliments en français', async () => {
    await i18next.changeLanguage('fr');
    expect(i18next.t('lists.itemsCount', { count: 0 })).toBe('0 aliment');
    expect(i18next.t('lists.itemsCount', { count: 1 })).toBe('1 aliment');
    expect(i18next.t('lists.itemsCount', { count: 14 })).toBe('14 aliments');
  });

  it('accorde les recettes possibles', async () => {
    await i18next.changeLanguage('fr');
    expect(i18next.t('recipes.possibleRecipes', { count: 1 })).toBe('1 recette possible');
    expect(i18next.t('recipes.possibleRecipes', { count: 7 })).toBe('7 recettes possibles');
  });

  it('accorde les jours et resultats', async () => {
    await i18next.changeLanguage('fr');
    expect(i18next.t('inventory.expiresIn', { count: 1 })).toBe('Expire dans 1 jour');
    expect(i18next.t('inventory.expiresIn', { count: 3 })).toBe('Expire dans 3 jours');
    expect(i18next.t('inventory.results', { count: 5 })).toBe('5 résultats');
  });

  it('accorde aussi en anglais', async () => {
    await i18next.changeLanguage('en');
    expect(i18next.t('lists.itemsCount', { count: 1 })).toBe('1 item');
    expect(i18next.t('lists.itemsCount', { count: 14 })).toBe('14 items');
  });

  it('accorde common.foodItem (donut du dashboard stats)', async () => {
    await i18next.changeLanguage('fr');
    expect(i18next.t('common.foodItem', { count: 1 })).toBe('aliment');
    expect(i18next.t('common.foodItem', { count: 4 })).toBe('aliments');
    await i18next.changeLanguage('en');
    expect(i18next.t('common.foodItem', { count: 1 })).toBe('item');
    expect(i18next.t('common.foodItem', { count: 4 })).toBe('items');
  });
});

// Les locales sont au format i18next v4 (_one / _other). Les suffixes v3
// (_plural, _0, _1...) ne resolvent pas et affichent la cle brute a l'ecran.
describe('garde-fou : pas de suffixe pluriel i18next v3 dans le code', () => {
  const ROOT = path.resolve(__dirname, '../..');
  const DIRS = ['screens', 'components', 'services', 'utils', 'hooks', 'contexts', 'navigation'];
  const LEGACY_SUFFIX = /\bt\(\s*['"`][^'"`]*_(?:plural|\d+)['"`]/;

  function sourceFiles(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
      if (e.name === 'node_modules') return [];
      const full = path.join(abs, e.name);
      if (e.isDirectory()) return sourceFiles(path.join(dir, e.name));
      return /\.tsx?$/.test(e.name) ? [full] : [];
    });
  }

  it("n'utilise nulle part t('cle_plural')", () => {
    const offenders = DIRS.flatMap(sourceFiles)
      .filter((f) => LEGACY_SUFFIX.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));

    expect(offenders).toEqual([]);
  });
});
