import { getScreenFromNotificationData } from '../../utils/notificationNavigation';

describe('getScreenFromNotificationData', () => {
  it('routes expiration_today to Recipes with ingredient', () => {
    const result = getScreenFromNotificationData({ type: 'expiration_today', foodName: 'Tomato' });
    expect(result.screen).toBe('Recipes');
    expect(result.params).toEqual({ ingredient: 'Tomato' });
  });
  it('routes expiration_today without foodName to Recipes without params', () => {
    const result = getScreenFromNotificationData({ type: 'expiration_today' });
    expect(result.screen).toBe('Recipes');
    expect(result.params).toBeUndefined();
  });
  it('routes daily_reminder to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'daily_reminder' }).screen).toBe('ExpiringSoon');
  });
  it('routes daily_summary to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'daily_summary' }).screen).toBe('ExpiringSoon');
  });
  it('routes weekly_recap to Home with showWeeklyRecap', () => {
    const result = getScreenFromNotificationData({ type: 'weekly_recap' });
    expect(result.screen).toBe('Home');
    expect(result.params).toEqual({ showWeeklyRecap: true });
  });
  it('routes unknown type to Home', () => {
    expect(getScreenFromNotificationData({ type: 'unknown' }).screen).toBe('Home');
  });
  it('handles null data gracefully', () => {
    const result = getScreenFromNotificationData(null);
    expect(result.screen).toBe('Home');
  });
});
