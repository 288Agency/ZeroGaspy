import { getScreenFromNotificationData } from '../../utils/notificationNavigation';

describe('getScreenFromNotificationData', () => {
  it('routes expiration_today with ids to ProductDetail', () => {
    const result = getScreenFromNotificationData({
      type: 'expiration_today',
      foodName: 'Tomato',
      itemId: 'i1',
      listId: 'l1',
    });
    expect(result.screen).toBe('ProductDetail');
    expect(result.params).toEqual({ itemId: 'i1', listId: 'l1' });
  });

  it('routes expiration_today without ids to ExpiringSoon', () => {
    const result = getScreenFromNotificationData({ type: 'expiration_today', foodName: 'Tomato' });
    expect(result.screen).toBe('ExpiringSoon');
  });

  it('routes expiration_warning with ids to ProductDetail', () => {
    const result = getScreenFromNotificationData({
      type: 'expiration_warning',
      itemId: 'i2',
      listId: 'l2',
    });
    expect(result.screen).toBe('ProductDetail');
    expect(result.params).toEqual({ itemId: 'i2', listId: 'l2' });
  });

  it('routes daily_recipe to CookTonight', () => {
    expect(getScreenFromNotificationData({ type: 'daily_recipe', foodName: 'Milk' }).screen).toBe(
      'CookTonight',
    );
  });

  it('routes daily_reminder to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'daily_reminder' }).screen).toBe('ExpiringSoon');
  });

  it('routes daily_summary to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'daily_summary' }).screen).toBe('ExpiringSoon');
  });

  it('routes re_engagement to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 're_engagement' }).screen).toBe('ExpiringSoon');
  });

  it('routes weekly_recap to Home with showWeeklyRecap', () => {
    const result = getScreenFromNotificationData({ type: 'weekly_recap' });
    expect(result.screen).toBe('Home');
    expect(result.params).toEqual({ showWeeklyRecap: true });
  });

  it('routes unknown type with foodName to Recipes (legacy)', () => {
    const result = getScreenFromNotificationData({ type: 'unknown', foodName: 'Egg' });
    expect(result.screen).toBe('Recipes');
    expect(result.params).toEqual({ ingredient: 'Egg' });
  });

  it('routes unknown type without foodName to Home', () => {
    expect(getScreenFromNotificationData({ type: 'unknown' }).screen).toBe('Home');
  });

  it('handles null data gracefully', () => {
    const result = getScreenFromNotificationData(null);
    expect(result.screen).toBe('Home');
  });
});
