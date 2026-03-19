import PostHog from 'posthog-react-native';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = 'https://eu.i.posthog.com'; // EU pour RGPD

type Props = Record<string, string | number | boolean | null>;

let posthog: PostHog | null = null;

// ── Initialisation ──────────────────────────────────────────────

export async function initAnalytics() {
  if (!POSTHOG_API_KEY) {
    console.warn('[Analytics] PostHog API key manquante — tracking désactivé');
    return;
  }

  posthog = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    enableSessionReplay: false,
    flushAt: 10,
    flushInterval: 30000,
  });
}

// ── Identification ──────────────────────────────────────────────

/** Identifier un user connecté (lie l'anonyme au compte) */
export function identifyUser(userId: string, properties?: Props) {
  posthog?.identify(userId, properties);
}

/** Reset quand l'user se déconnecte */
export function resetAnalytics() {
  posthog?.reset();
}

// ── Screen tracking ─────────────────────────────────────────────

export function trackScreen(screenName: string, properties?: Props) {
  posthog?.screen(screenName, properties);
}

// ── Events ──────────────────────────────────────────────────────

function track(event: string, properties?: Props) {
  posthog?.capture(event, properties);
}

// App lifecycle
export function trackAppOpened() {
  track('app_opened');
}

// Onboarding
export function trackOnboardingCompleted() {
  track('onboarding_completed');
}

export function trackOnboardingSkipped(step: number) {
  track('onboarding_skipped', { step });
}

// Auth
export function trackAccountCreated(method: 'email' | 'apple' | 'local') {
  track('account_created', { method });
}

export function trackSignIn(method: 'email' | 'apple') {
  track('sign_in', { method });
}

export function trackAuthSkipped() {
  track('auth_skipped');
}

// Food management
export function trackFoodAdded(properties: {
  category?: string;
  hasExpiryDate: boolean;
  hasPrice: boolean;
  source?: string;
}) {
  track('food_added', properties);
}

export function trackFoodConsumed(properties: {
  category?: string;
  daysBeforeExpiry?: number;
}) {
  track('food_consumed', properties);
}

export function trackFoodThrown(properties: {
  category?: string;
  daysExpired?: number;
}) {
  track('food_thrown', properties);
}

// Lists
export function trackListCreated() {
  track('list_created');
}

export function trackListShared() {
  track('list_shared');
}

// Recipes
export function trackRecipeViewed(recipeId?: string) {
  track('recipe_viewed', { recipe_id: recipeId ?? null });
}

// Paywall & Premium
export function trackPaywallViewed(source: string) {
  track('paywall_viewed', { source });
}

export function trackPaywallDismissed(source: string) {
  track('paywall_dismissed', { source });
}

export function trackPurchaseCompleted(plan: string) {
  track('purchase_completed', { plan });
}

// Gamification
export function trackBadgeUnlocked(badgeId: string, tier: string) {
  track('badge_unlocked', { badge_id: badgeId, tier });
}

export function trackChallengeCompleted(challengeId: string, difficulty: string) {
  track('challenge_completed', { challenge_id: challengeId, difficulty });
}

// Share
export function trackShareRecap() {
  track('share_recap');
}

// OCR
export function trackOcrUsed(success: boolean) {
  track('ocr_used', { success });
}

// Proactive recipe card
export function trackProactiveRecipeTapped(recipeId: string, recipeName: string, matchPercentage: number) {
  track('proactive_recipe_tapped', { recipe_id: recipeId, recipe_name: recipeName, match_percentage: matchPercentage });
}

// Active onboarding
export function trackOnboardingFoodAdded(count: number) {
  track('onboarding_food_added', { count });
}

export function trackOnboardingRecipeViewed() {
  track('onboarding_recipe_viewed');
}

export function trackOnboardingStepCompleted(step: string) {
  track('onboarding_step_completed', { step });
}

// Referral
export function trackReferralCodeShared() {
  track('referral_code_shared');
}

export function trackReferralCompleted(referrerId: string) {
  track('referral_completed', { referrer_id: referrerId });
}

export function trackBonusScanUsed() {
  track('bonus_scan_used');
}

// ── Cleanup ─────────────────────────────────────────────────────

export async function shutdownAnalytics() {
  await posthog?.flush();
  posthog?.shutdown();
}
