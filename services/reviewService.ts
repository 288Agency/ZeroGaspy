import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import logger from '../utils/logger';

const LAST_REVIEW_KEY = '@zerogaspy_last_review_request';
const REVIEW_COUNT_KEY = '@zerogaspy_review_request_count';

const MIN_DAYS_BETWEEN_REQUESTS = 60;
const MAX_TOTAL_REQUESTS = 3;
const MIN_DAYS_ACTIVE = 3;
const DELAY_BEFORE_PROMPT_MS = 3000;

let pendingRequest = false;

export async function maybeRequestReview(daysActive: number): Promise<boolean> {
  try {
    if (pendingRequest) {
      return false;
    }

    if (daysActive < MIN_DAYS_ACTIVE) {
      return false;
    }

    const [countStr, lastRequestStr] = await Promise.all([
      AsyncStorage.getItem(REVIEW_COUNT_KEY),
      AsyncStorage.getItem(LAST_REVIEW_KEY),
    ]);

    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= MAX_TOTAL_REQUESTS) {
      return false;
    }

    if (lastRequestStr) {
      const daysSinceLast = Math.floor(
        (Date.now() - parseInt(lastRequestStr, 10)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLast < MIN_DAYS_BETWEEN_REQUESTS) {
        return false;
      }
    }

    const canRequest = await StoreReview.hasAction();
    if (!canRequest) {
      return false;
    }

    pendingRequest = true;

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await StoreReview.requestReview();
          await Promise.all([
            AsyncStorage.setItem(REVIEW_COUNT_KEY, String(count + 1)),
            AsyncStorage.setItem(LAST_REVIEW_KEY, String(Date.now())),
          ]);
          logger.info('Store review requested successfully');
          resolve(true);
        } catch (error) {
          logger.error('Failed to request store review:', error);
          resolve(false);
        } finally {
          pendingRequest = false;
        }
      }, DELAY_BEFORE_PROMPT_MS);
    });
  } catch (error) {
    logger.error('Error in maybeRequestReview:', error);
    return false;
  }
}
