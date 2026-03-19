# Sprint 1 — Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 6 highest-impact activation & retention issues to keep ZeroGaspy's first 50 users engaged past D7.

**Architecture:** Six independent fixes across notification handling, onboarding gamification, push scheduling, logging hygiene, and backend security. Each task is self-contained. No shared state between tasks.

**Tech Stack:** React Native + Expo SDK 52, TypeScript, Supabase Edge Functions (Deno), expo-notifications, AsyncStorage, @react-navigation/native

---

## Pre-flight checklist

- [ ] `npx expo start` runs without errors
- [ ] You can build locally (`npx expo run:ios` or `npx expo run:android`)
- [ ] Supabase CLI is installed: `npx supabase --version`

---

## Task 1: Fix notification tap → navigation (confirmed no-op bug)

**Problem:** `App.tsx` line 212 — `addNotificationResponseListener` callback only calls `logger.info()`. Tapping any push notification does nothing. The notification payload includes `data: { type: 'expiration_today' | 'daily_reminder' }` which is discarded.

**Fix:** Add a `navigationRef` to `App.tsx` and route notification taps to `ExpiringSoon` screen.

**Files:**
- Modify: `App.tsx`

---

- [ ] **Step 1.1 — Write the failing test**

Create `__tests__/services/notificationNavigation.test.ts`:

```ts
// Tests that notification data types map to the correct screen names
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
```

- [ ] **Step 1.2 — Run test to verify it fails**

```bash
cd "C:\Users\Quentin\Application\Zerogaspy\ZeroGaspyLocal"
npx jest __tests__/services/notificationNavigation.test.ts --no-coverage
```

Expected: FAIL — `getScreenFromNotificationData` not found.

- [ ] **Step 1.3 — Create the utility**

Create `utils/notificationNavigation.ts`:

```ts
import { RootStackParamList } from '../types/navigation';

// Only routes that require no params can be navigated to from a notification tap.
// ExpiringSoon and Home both have `undefined` params in RootStackParamList.
export type NotificationDestination = keyof Pick<RootStackParamList, 'ExpiringSoon' | 'Home'>;

/**
 * Maps notification data payload to a navigation screen name.
 * Return type is constrained to routes with no required params.
 */
export function getScreenFromNotificationData(
  data: Record<string, unknown> | null | undefined
): NotificationDestination {
  if (!data) return 'Home';
  const type = data.type as string | undefined;
  switch (type) {
    case 'expiration_today':
    case 'daily_reminder':
    case 'expiration_warning':
      return 'ExpiringSoon';
    default:
      return 'Home';
  }
}
```

- [ ] **Step 1.4 — Run test to verify it passes**

```bash
npx jest __tests__/services/notificationNavigation.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 1.5 — Wire navigationRef in App.tsx**

In `App.tsx`, add the following (at the TOP of the file, after existing imports):

```ts
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types/navigation';
import { getScreenFromNotificationData } from './utils/notificationNavigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
```

Then in `RootNavigator`, find the `addNotificationResponseListener` call (lines 211-214) and replace the callback body:

```ts
// BEFORE:
responseListener.current = addNotificationResponseListener((response) => {
  logger.info('Réponse notification:', response.notification.request.content.title);
});

// AFTER:
responseListener.current = addNotificationResponseListener((response) => {
  logger.info('Notification tapped:', response.notification.request.content.title);
  const data = response.notification.request.content.data as Record<string, unknown> | null;
  const screen = getScreenFromNotificationData(data);
  if (navigationRef.isReady()) {
    // Type is already constrained to param-less routes — no cast needed
    navigationRef.navigate(screen);
  }
});
```

Also update **both** `NavigationContainer` instances to use the ref (one at line ~281 for the unauthenticated path, one at line ~290 for the authenticated path):

```tsx
// Line ~281 — unauthenticated (AuthNavigator):
<NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>

// Line ~290 — authenticated (AppNavigator):
<NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
```

Note: attaching the same ref to both is safe because only one branch renders at a time.

- [ ] **Step 1.6 — Manual test**

Run the app on a device. Trigger a local notification via `checkAndScheduleNotifications()` (or use Expo's notification debugger). Tap the notification. Verify it navigates to the `ExpiringSoon` screen.

- [ ] **Step 1.7 — Commit**

```bash
git add utils/notificationNavigation.ts __tests__/services/notificationNavigation.test.ts App.tsx
git commit -m "fix: route notification taps to ExpiringSoon screen (was no-op)"
```

---

## Task 2: Wire gamification in ActiveOnboardingScreen + aha moment

**Problem:** `ActiveOnboardingScreen.tsx` `handleAddFood()` calls `trackOnboardingFoodAdded()` (PostHog only) but never calls `trackFoodAdded()` from `GamificationContext`. The `first_food` badge and 10 XP are never awarded during onboarding. Additionally, there is no feedback showing the user the value they just created.

**Fix:** Call `trackFoodAdded()` from `GamificationContext` and show a savings message after first food is added.

**Files:**
- Modify: `screens/ActiveOnboardingScreen.tsx`

---

- [ ] **Step 2.1 — Add GamificationContext import**

In `screens/ActiveOnboardingScreen.tsx`, add to the imports:

```ts
import { useGamification } from '../contexts/GamificationContext';
```

- [ ] **Step 2.2 — Call trackFoodAdded and show aha moment**

At the top of the `ActiveOnboardingScreen` component function, add:

```ts
const { trackFoodAdded } = useGamification();
const [showAhaMoment, setShowAhaMoment] = useState(false);
```

In `handleAddFood`, after `await addItemToList(currentListId, newItem);` and BEFORE the form reset, add:

```ts
// Award XP + trigger first_food badge via gamification system
// Pass currentListId so challenge progress tracking has full context
await trackFoodAdded(currentListId ?? undefined);

// Show aha moment on first food only
if (addedItems.length === 0) {
  setShowAhaMoment(true);
}
```

- [ ] **Step 2.3 — Render the aha moment message**

In the `addMore` step render section, add a conditional block just after the list of added items. Find the section that renders `addMore` step content and add:

```tsx
{showAhaMoment && (
  <View style={styles.ahaMomentBanner}>
    <Text style={styles.ahaMomentEmoji}>🌍</Text>
    <Text style={styles.ahaMomentText}>
      {t('onboarding.ahaMoment')}
    </Text>
  </View>
)}
```

Add the styles:

```ts
ahaMomentBanner: {
  backgroundColor: COLORS.primary[500] + '15',
  borderRadius: RADIUS.md,
  borderLeftWidth: 3,
  borderLeftColor: COLORS.primary[500],
  padding: scaleSpacing(12),
  marginBottom: scaleSpacing(16),
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
ahaMomentEmoji: {
  fontSize: scaleFontSize(20),
},
ahaMomentText: {
  ...TYPOGRAPHY.bodySmall,
  color: COLORS.primary[500],
  flex: 1,
},
```

- [ ] **Step 2.4 — Add translation keys**

In `i18n/locales/fr.json`, inside the `onboarding` section, add:

```json
"ahaMoment": "Premier aliment sauvé ! Tu viens peut-être d'éviter ~0.30€ de gaspillage 🌱"
```

In `i18n/locales/en.json`, inside the `onboarding` section, add:

```json
"ahaMoment": "First item saved! You just potentially avoided ~€0.30 of waste 🌱"
```

- [ ] **Step 2.5 — Manual test**

Run app, go through onboarding, add a food item. Verify:
1. The aha moment banner appears on the `addMore` step
2. An achievement toast appears (first_food badge + 15 XP: 5 base + 10 badge reward)
3. A second food does NOT show the aha moment again

- [ ] **Step 2.6 — Commit**

```bash
git add screens/ActiveOnboardingScreen.tsx i18n/locales/fr.json i18n/locales/en.json
git commit -m "feat: award first_food badge and show aha moment during onboarding"
```

---

## Task 3: D+1 welcome-back push notification

**Problem:** After onboarding, there is no D+1 notification to bring the user back. The first 24 hours are the most critical retention window.

**Fix:** Schedule a one-time notification 23 hours after onboarding completion.

**Files:**
- Modify: `services/notificationService.ts`
- Modify: `App.tsx`

---

- [ ] **Step 3.1 — Write the failing test**

In `__tests__/services/notificationService.test.ts`, add a new test (append to the existing file, don't replace it):

```ts
describe('scheduleWelcomeBackNotification', () => {
  it('exports scheduleWelcomeBackNotification function', () => {
    const { scheduleWelcomeBackNotification } = require('../../services/notificationService');
    expect(typeof scheduleWelcomeBackNotification).toBe('function');
  });
});
```

- [ ] **Step 3.2 — Run test to verify it fails**

```bash
npx jest __tests__/services/notificationService.test.ts --no-coverage
```

Expected: FAIL — `scheduleWelcomeBackNotification` is undefined.

- [ ] **Step 3.3 — Implement the function**

In `services/notificationService.ts`, add this function at the end (before the closing of the file):

```ts
/**
 * Schedule a one-time "welcome back" notification 23 hours after onboarding.
 * This is the D+1 hook — the most important push in the user's lifecycle.
 * Only scheduled once; subsequent calls are no-ops if already scheduled.
 */
const WELCOME_BACK_NOTIF_KEY = 'welcome_back_notif_scheduled';

export async function scheduleWelcomeBackNotification(): Promise<void> {
  try {
    const alreadyScheduled = await AsyncStorage.getItem(WELCOME_BACK_NOTIF_KEY);
    if (alreadyScheduled) return;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌿 Ta streak continue !',
        body: 'Vérifie ton frigo — des aliments pourraient bientôt expirer.',
        data: { type: 'daily_reminder' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 23 * 60 * 60, // 23 hours
      },
    });

    await AsyncStorage.setItem(WELCOME_BACK_NOTIF_KEY, 'true');
    logger.info('D+1 welcome-back notification scheduled');
  } catch (error) {
    logger.error('Error scheduling welcome-back notification:', error);
  }
}
```

- [ ] **Step 3.4 — Run test to verify it passes**

```bash
npx jest __tests__/services/notificationService.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 3.5 — Call it from onboarding completion**

In `App.tsx`, add the import:

```ts
import { scheduleWelcomeBackNotification } from './services/notificationService';
```

Update `handleOnboardingComplete`:

```ts
const handleOnboardingComplete = () => {
  trackOnboardingCompleted();
  scheduleWelcomeBackNotification(); // D+1 hook — fire and forget
  setShowOnboarding(false);
};
```

- [ ] **Step 3.6 — Manual test**

> **Important:** `scheduleWelcomeBackNotification` is a no-op on iOS Simulator and Android Emulator — `requestNotificationPermissions()` returns `false` on non-physical devices. Use a real device for this test.

Complete onboarding on a physical device. Wait ~23 hours (or temporarily lower the `seconds` value to 60 for testing, then restore). Verify the welcome-back notification appears.

- [ ] **Step 3.7 — Commit**

```bash
git add services/notificationService.ts App.tsx __tests__/services/notificationService.test.ts
git commit -m "feat: schedule D+1 welcome-back push notification after onboarding"
```

---

## Task 4: Remove production console.logs from HomeScreen

**Problem:** `HomeScreen.tsx` lines ~172-176 have `console.log` statements that expose the user's Supabase ID in logs and slow down the JS thread in production.

**Files:**
- Modify: `screens/HomeScreen.tsx`

---

- [ ] **Step 4.1 — Find all console.log in HomeScreen**

```bash
grep -n "console\." screens/HomeScreen.tsx
```

Note all line numbers.

- [ ] **Step 4.2 — Replace with logger.debug**

In `screens/HomeScreen.tsx`, replace the force sync block:

```ts
// BEFORE:
console.log('[FORCE SYNC] key:', syncKey, 'done:', done);
// ...
console.log('[FORCE SYNC] Starting...');
// ...
console.log(`[FORCE SYNC] Result: ${synced} synced, ${errors} errors`);
// ...
console.error('[FORCE SYNC] Error:', err);

// AFTER:
logger.debug('[FORCE SYNC] key done:', !!done);
// ...
logger.debug('[FORCE SYNC] Starting...');
// ...
logger.debug(`[FORCE SYNC] Result: ${synced} synced, ${errors} errors`);
// ...
logger.error('[FORCE SYNC] Error:', err);
```

Note: do NOT include `syncKey` or `user.id` in any log message. Log existence (`!!done`) not values.

- [ ] **Step 4.3 — Verify no console statements remain**

```bash
grep -n "console\." screens/HomeScreen.tsx
```

Expected: no output.

- [ ] **Step 4.4 — Run the app and verify force sync still works**

Open app while logged in. Check that sync completes without errors (look for Sentry events, not console output).

- [ ] **Step 4.5 — Commit**

```bash
git add screens/HomeScreen.tsx
git commit -m "fix: replace console.log with logger in HomeScreen force sync"
```

---

## Task 5: Move scan credit validation to Supabase Edge Function

**Problem:** `premiumFeaturesService.ts` stores the monthly free scan credit in AsyncStorage. On a rooted device this can be cleared to get unlimited free scans. The validation must happen server-side.

**Files:**
- Create: `supabase/functions/validate-scan-credit/index.ts`
- Create: `supabase/migrations/20260319_scan_credits.sql`
- Modify: `services/premiumFeaturesService.ts`

---

- [ ] **Step 5.1 — Create the database migration**

Create `supabase/migrations/20260319_scan_credits.sql`:

```sql
-- Table to track monthly free receipt scan credits server-side
CREATE TABLE IF NOT EXISTS scan_credits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

-- Only the user can read/write their own scan credits
ALTER TABLE scan_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scan credits"
  ON scan_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan credits"
  ON scan_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 5.2 — Apply the migration**

```bash
npx supabase db push
```

Or via Supabase MCP if available.

- [ ] **Step 5.3 — Create the Edge Function**

Create `supabase/functions/validate-scan-credit/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ allowed: false, reason: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the current user from the JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ allowed: false, reason: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const action: 'check' | 'consume' = body.action ?? 'check';
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Check if credit has been used this month
    const { data: existing } = await supabase
      .from('scan_credits')
      .select('month')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .maybeSingle();

    const hasUsed = existing !== null;

    if (action === 'check') {
      return new Response(JSON.stringify({ allowed: !hasUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'consume': mark credit as used (idempotent)
    if (!hasUsed) {
      await supabase.from('scan_credits').insert({
        user_id: user.id,
        month: currentMonth,
      });
    }

    return new Response(JSON.stringify({ consumed: !hasUsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ allowed: false, reason: 'server_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 5.4 — Deploy the Edge Function**

```bash
npx supabase functions deploy validate-scan-credit
```

- [ ] **Step 5.5 — Update premiumFeaturesService.ts**

Replace the `hasUsedFreeReceiptScanThisMonth`, `markFreeReceiptScanAsUsed`, and `canScanReceipt` functions. Keep `getFreeReceiptScanInfo` and `resetFreeReceiptScanCredit` for local fallback/tests.

In `services/premiumFeaturesService.ts`, add at the top:

```ts
import { supabase } from '../config/supabase';

const SCAN_CREDIT_FUNCTION_NAME = 'validate-scan-credit';
```

Replace `hasUsedFreeReceiptScanThisMonth`:

```ts
export async function hasUsedFreeReceiptScanThisMonth(userId: string | null): Promise<boolean> {
  // Authenticated users: check server-side (tamper-proof)
  if (userId) {
    try {
      const { data, error } = await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'check' },
      });
      if (!error && data) {
        return !data.allowed;
      }
    } catch (err) {
      logger.error('Edge function check failed, falling back to local:', err);
    }
  }

  // Unauthenticated users or fallback: check AsyncStorage
  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    if (!creditData) return false;
    const credit: ReceiptScanCredit = JSON.parse(creditData);
    return credit.month === new Date().toISOString().slice(0, 7);
  } catch {
    return false;
  }
}
```

Replace `markFreeReceiptScanAsUsed`:

```ts
export async function markFreeReceiptScanAsUsed(userId: string | null): Promise<void> {
  // Authenticated users: consume server-side
  if (userId) {
    try {
      await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'consume' },
      });
    } catch (err) {
      logger.error('Edge function consume failed:', err);
    }
  }

  // Always mirror locally as fallback
  const now = new Date();
  const credit: ReceiptScanCredit = {
    lastUsedDate: now.toISOString(),
    month: now.toISOString().slice(0, 7),
  };
  await AsyncStorage.setItem(RECEIPT_SCAN_CREDIT_KEY, JSON.stringify(credit));
}
```

Also update `getFreeReceiptScanInfo` — it currently calls `hasUsedFreeReceiptScanThisMonth()` with no args, which breaks compilation after the signature change. Add a `userId` parameter:

```ts
export async function getFreeReceiptScanInfo(userId: string | null): Promise<{...}> {
  try {
    const hasUsed = await hasUsedFreeReceiptScanThisMonth(userId);
    // ... rest unchanged
```

Update `canScanReceipt` signature to pass userId to `hasUsedFreeReceiptScanThisMonth`:

```ts
export async function canScanReceipt(
  userId: string | null,
  isPremium: boolean,
): Promise<{ allowed: boolean; source: ScanSource | null }> {
  if (isPremium) return { allowed: true, source: 'premium' };

  const hasUsed = await hasUsedFreeReceiptScanThisMonth(userId);
  if (!hasUsed) return { allowed: true, source: 'monthly_free' };

  if (userId) {
    const bonus = await getBonusScansRemaining(userId);
    if (bonus > 0) return { allowed: true, source: 'bonus' };
  }

  return { allowed: false, source: null };
}
```

- [ ] **Step 5.6 — Find callers of markFreeReceiptScanAsUsed and update signatures**

```bash
grep -rn "markFreeReceiptScanAsUsed\|hasUsedFreeReceiptScanThisMonth" --include="*.ts" --include="*.tsx" .
```

For each caller, update to pass `userId` parameter.

- [ ] **Step 5.7 — Manual test**

1. Log in with a real account.
2. Attempt a receipt scan — should succeed (first time, uses `monthly_free` credit).
3. Check Supabase table `scan_credits` — entry should exist for current month.
4. Attempt scan again — should be blocked and show paywall.
5. Clear AsyncStorage (dev menu) — scan should STILL be blocked (server-side check wins).

- [ ] **Step 5.8 — Commit**

```bash
git add supabase/functions/validate-scan-credit/index.ts supabase/migrations/20260319_scan_credits.sql services/premiumFeaturesService.ts
git commit -m "feat: move scan credit validation to Supabase Edge Function (server-side security)"
```

---

## Task 6: Confirm OnboardingScreen.tsx is unused and clean up

**Context:** `OnboardingScreen.tsx` (passive slides) is NOT referenced in `App.tsx`. `App.tsx` directly renders `ActiveOnboardingScreen`. The old slides file is dead code. Confirm and delete it.

**Files:**
- Delete: `screens/OnboardingScreen.tsx` (if confirmed unused)

---

- [ ] **Step 6.1 — Confirm OnboardingScreen.tsx has no importers**

```bash
grep -rn "OnboardingScreen" --include="*.ts" --include="*.tsx" . | grep -v "ActiveOnboarding"
```

Expected: only `screens/OnboardingScreen.tsx` itself appears (if it imports anything), plus possibly `navigation/` files. If it appears in any navigator, DO NOT delete — investigate first.

- [ ] **Step 6.2 — Delete if unused**

If Step 6.1 shows no importers:

```bash
rm screens/OnboardingScreen.tsx
```

- [ ] **Step 6.3 — Verify app still runs**

```bash
npx expo start
```

Expected: no missing module errors.

- [ ] **Step 6.4 — Commit**

```bash
git add -A
git commit -m "chore: remove unused OnboardingScreen (slides replaced by ActiveOnboardingScreen)"
```

---

## Final verification

- [ ] Run all tests: `npx jest --no-coverage`
- [ ] Start the app: `npx expo start`
- [ ] Walk through the full onboarding flow on a device:
  - First food added → aha moment banner shows + achievement toast fires (first_food badge)
  - Complete onboarding → D+1 notification scheduled for ~23h later
  - Tap any notification → navigates to ExpiringSoon screen
- [ ] Verify HomeScreen has no `console.log` output in Metro logs
- [ ] Verify receipt scan credit is validated server-side (check `scan_credits` Supabase table)

---

## Spec reference

`docs/superpowers/specs/2026-03-19-zerogaspy-app-review.md` — Sprint 1 section
