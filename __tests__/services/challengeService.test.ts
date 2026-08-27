jest.mock('../../services/supabase/cloudSyncQueue', () => ({
  queueGamificationPush: jest.fn(),
  queueChallengesPush: jest.fn(),
  setCurrentSyncUserId: jest.fn(),
  getCurrentSyncUserId: jest.fn(() => null),
}));

import {
  getISOWeeksInYear,
  getPreviousWeekKey,
  getActiveChallenges,
} from '../../services/challengeService';

describe('getISOWeeksInYear', () => {
  it('retourne 53 pour 2020 (bissextile, jan 1 = mercredi)', () => {
    expect(getISOWeeksInYear(2020)).toBe(53);
  });

  it('retourne 53 pour 2026 (non bissextile, jan 1 = jeudi)', () => {
    expect(getISOWeeksInYear(2026)).toBe(53);
  });

  it('retourne 53 pour 2015 (jan 1 = jeudi)', () => {
    expect(getISOWeeksInYear(2015)).toBe(53);
  });

  it('retourne 52 pour 2021', () => {
    expect(getISOWeeksInYear(2021)).toBe(52);
  });

  it('retourne 52 pour 2024 (bissextile mais jan 1 = lundi)', () => {
    expect(getISOWeeksInYear(2024)).toBe(52);
  });
});

describe('getPreviousWeekKey', () => {
  it('décrémente une semaine simple dans la même année', () => {
    expect(getPreviousWeekKey('2026-W10')).toBe('2026-W09');
  });

  it('passe à la semaine 53 quand on recule vers 2020 (53 semaines ISO)', () => {
    expect(getPreviousWeekKey('2021-W01')).toBe('2020-W53');
  });

  it('passe à la semaine 52 quand on recule vers 2021 (52 semaines ISO)', () => {
    expect(getPreviousWeekKey('2022-W01')).toBe('2021-W52');
  });

  it('passe à la semaine 53 quand on recule vers 2026 (53 semaines ISO)', () => {
    expect(getPreviousWeekKey('2027-W01')).toBe('2026-W53');
  });

  it('padding sur 2 chiffres pour les semaines < 10', () => {
    expect(getPreviousWeekKey('2026-W05')).toBe('2026-W04');
  });
});

describe('équilibre usage / résultat', () => {
  // 21 des 30 défis récompensent l'usage de l'app et 9 seulement le résultat.
  // Sans garde-fou, une semaine entière pouvait ne demander que d'ajouter des
  // aliments et de consulter des recettes — donc gagner tout son XP sans sauver
  // quoi que ce soit, voire en jetant son frigo.
  const estResultat = (c: { category: string; id: string }) =>
    c.category === 'saving' || c.id.startsWith('no_throw');

  it('propose au moins un défi de résultat chaque semaine, sur 60 semaines', () => {
    const semainesSansResultat: string[] = [];
    for (let w = 1; w <= 60; w++) {
      const weekKey = `2026-W${String(w).padStart(2, '0')}`;
      const defis = getActiveChallenges(weekKey);
      if (!defis.some(estResultat)) semainesSansResultat.push(weekKey);
    }
    expect(semainesSansResultat).toEqual([]);
  });

  it('garde trois défis de difficultés distinctes', () => {
    const defis = getActiveChallenges('2026-W35');
    expect(defis).toHaveLength(3);
    expect(new Set(defis.map((d) => d.difficulty)).size).toBe(3);
  });

  it('reste déterministe pour une même semaine', () => {
    const a = getActiveChallenges('2026-W35').map((d) => d.id);
    const b = getActiveChallenges('2026-W35').map((d) => d.id);
    expect(a).toEqual(b);
  });
});
