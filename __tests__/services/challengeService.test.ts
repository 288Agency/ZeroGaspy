import { getISOWeeksInYear, getPreviousWeekKey } from '../../services/challengeService';

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
