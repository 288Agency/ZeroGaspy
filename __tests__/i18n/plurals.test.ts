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
});
