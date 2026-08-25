import { getFoodEmojiSlug } from '../../services/foodEmojiService';

describe('getFoodEmojiSlug', () => {
  it('résout un nom exact', () => {
    expect(getFoodEmojiSlug('pomme')).toBe('redApple');
    expect(getFoodEmojiSlug('Carottes')).toBe('carrot');
  });

  it('privilégie le mot-clé le plus spécifique', () => {
    expect(getFoodEmojiSlug('pomme de terre')).toBe('potato');
    expect(getFoodEmojiSlug('Patates douces bio')).toBe('sweetPotato');
    expect(getFoodEmojiSlug('pain au chocolat')).toBe('croissant');
  });

  it('ignore accents et casse', () => {
    expect(getFoodEmojiSlug('PÊCHES')).toBe('peach');
    expect(getFoodEmojiSlug('creme fraiche')).toBe('milk');
    expect(getFoodEmojiSlug("gateau d'anniversaire")).toBe('birthday');
  });

  it('matche à l’intérieur d’un libellé produit', () => {
    expect(getFoodEmojiSlug('Yaourt nature Danone x4')).toBe('bowlSpoon');
    expect(getFoodEmojiSlug('Filet de saumon fumé')).toBe('fish');
  });

  it('retombe sur la catégorie puis sur le défaut', () => {
    expect(getFoodEmojiSlug('zzzz inconnu', 'fromages')).toBe('cheese');
    expect(getFoodEmojiSlug('zzzz inconnu', 'Légumes')).toBe('carrot');
    expect(getFoodEmojiSlug('zzzz inconnu')).toBe('plate');
    expect(getFoodEmojiSlug()).toBe('plate');
  });
});
