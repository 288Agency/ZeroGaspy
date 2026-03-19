import { getScreenFromNotificationData } from '../../utils/notificationNavigation';

describe('getScreenFromNotificationData', () => {
  it('routes expiration_today to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'expiration_today' })).toBe('ExpiringSoon');
  });
  it('routes daily_reminder to ExpiringSoon', () => {
    expect(getScreenFromNotificationData({ type: 'daily_reminder' })).toBe('ExpiringSoon');
  });
  it('routes unknown type to Home', () => {
    expect(getScreenFromNotificationData({ type: 'unknown' })).toBe('Home');
  });
  it('handles null data gracefully', () => {
    expect(getScreenFromNotificationData(null)).toBe('Home');
  });
});
