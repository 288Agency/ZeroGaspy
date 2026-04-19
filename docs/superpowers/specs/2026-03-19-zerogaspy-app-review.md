# ZeroGaspy — Comprehensive App Review & Improvement Roadmap
**Date:** 2026-03-19
**Context:** App is live on App Store with ~50 downloads, PostHog just integrated (no data yet), early stage pre-product-market-fit.

---

## Executive Summary

ZeroGaspy has a strong technical foundation and a unique competitive position: **the only app combining food inventory + proactive recipes + gamification**. No direct competitor does all three. The main risks at this stage are activation (users don't reach the "aha moment") and retention (no strong D1/D7 hooks). The roadmap below prioritizes these before scaling.

---

## Section 1 — Onboarding & First Value Moment

### Strengths
- `ActiveOnboardingScreen` forces user to add real food during onboarding — correct approach used by Duolingo, Headspace, Notion.
- Analytics tracking on onboarding steps (`trackOnboardingStepCompleted`) ready for PostHog data.
- Local mode (no account required) reduces friction for skeptical users.

### Issues

**1. No personalization after onboarding.**
Home screen shows generic "Bonjour !" with no user name. Duolingo says "Bon retour, [Prénom] 🌱". Small detail, large impact on belonging.

**2. No immediate impact feedback on first food added.**
The user should see instantly: "Tu viens de sauver 0.30€ de gaspillage potentiel 🌍". Value must be felt in the first minute, not after 7 days.

**3. Passive slides before active onboarding = double friction.**
Apps with highest conversion (Notion, Duolingo) skip informational slides and go straight to the core action. The carrot/apple/broccoli slide illustrations are visually polished but delay the value moment.

**4. No user persona selection at entry.**
Apps like MyFitnessPal, Yazio ask "What is your main challenge?" → "I throw too many vegetables / I lose money / I want to cook smarter". This personalizes the experience AND generates valuable product data.

**5. Aha moment path unclear.**
ZeroGaspy's "aha moment" should be: seeing a recipe suggested from current fridge inventory. Is the user reaching this within 5 minutes of install?

---

## Section 2 — UX / Design

### Strengths
- Solid design system (`utils/designSystem.ts`) with semantic tokens, consistent palette, shadows, radius.
- Cream/green palette distinctive and coherent with eco universe.
- Polished animations: staggered entries, spring physics, PressableScale with haptics.
- Good responsive handling with `scaleSize`, `isSmallScreen`.
- GlassTabBar: modern glassmorphism, well executed.

### Issues

**1. No dark mode.**
Dark mode was intentionally removed entirely (architectural decision, not an oversight — COLORS_DARK deleted, isDark removed from all files). Dark mode opt-in on iOS is between 30-55% depending on demographic and time of day. Friction is real especially for evening fridge-check scenarios. Recommend reconsidering with a system-follow mode — but this has a migration cost given the full removal.

**2. Home screen overloaded.**
BackgroundDecoration + LogoSection + StatsCardsRow + WeeklyChallengeCard + SpacesGrid + ProactiveRecipeCard = too many competing elements. High-retention apps (Todoist, Notion) have one clear primary action visible above the fold. User doesn't know what to do first.

**3. Empty states likely unexploited.**
When fridge is empty, what does the user see? Empty states are conversion opportunities. Notion, Linear, Duolingo use empty states to explain value and invite action with humor or emotion.

**4. Partial accessibility.**
Some `accessibilityLabel` and `accessibilityRole` exist but inconsistently applied. No full VoiceOver/TalkBack support. Not blocking now but affects App Store ranking.

**5. Mixed icon systems.**
Custom SVG icons (FlameIcon, LeafIcon, EarthIcon) mixed with generic Ionicons. Creates subtle visual inconsistency. Premium apps (Duolingo, Calm) use 100% custom icon sets.

**6. Micro-animations on key actions.**
`ConfettiBurst` and `SavedFoodPulse` components exist — good initiative. Should trigger on every individual food save action, not just milestones. Addictive apps (Duolingo, Habitica) celebrate every small action.

### Competitor Comparison
- **Too Good To Go**: orange/green palette, very few elements per screen, single huge CTA
- **Bring!**: colorful but structured, each list is a bright color — instant scannability
- **OurGroceries**: minimalist but soulless — ZeroGaspy's design clearly beats this

---

## Section 3 — Features & Product

### Strengths
- Complete input stack: barcode scan, OCR date scanner, receipt scan, manual entry, image picker.
- Proactive recipes based on inventory with match score and urgency score for expiring ingredients — ZeroGaspy's true differentiator.
- Rich gamification: XP, levels, 5 badge tiers, no-waste + daily streaks, weekly challenges.
- List sharing with members — well-designed family/roommate feature.
- Referral program with bonus scans — viral acquisition loop built in.

### Issues

**1. Recipe database is hardcoded.**
`RECIPES_DATABASE` is a static array in `recipeService.ts`. Adding recipes requires a new app build + App Store review. Must migrate to Supabase for dynamic content and A/B testing.

**2. No shopping list generation from recipes.**
User sees a recipe → missing 3 ingredients → no way to add them to a shopping list. Bring! and AnyList built their entire retention on this. It's the most critical missing feature: *recipe → shopping list → inventory → recipe*.

**3. No iOS/Android widget.**
A food app without a widget loses passive engagement. Primary use case: open phone in morning, see "3 items expiring today" on home screen. Expo supports widgets experimentally.

**4. No food photo recognition.**
Barcode works for packaged goods. For carrots, apples, leftovers — manual entry only. Google Vision or Claude Vision API could identify food from a photo.

**5. No meal planning.**
"What do I eat this week?" is the question the target user asks every Sunday. Weekly planning based on inventory + recipes = guaranteed daily engagement. Yummly and Mealime built their retention almost entirely on this.

**6. Gamification weakly connected to recipes.**
Viewing a recipe awards XP (`totalRecipesViewed`) but no specific "Anti-waste Chef" badge, no challenge "Cook 3 recipes with expiring ingredients this week." The recipe ↔ gamification link is too weak.

**7. No "cooked history" journal.**
Duolingo has lesson history, Strava has run history. ZeroGaspy has no anti-waste journal — a log of what you cooked, what you saved, with which recipe. Powerful retention feature: creates narrative progress.

### Feature Comparison

| Feature | ZeroGaspy | Bring! | OurGroceries | NoWaste |
|---|---|---|---|---|
| Barcode scan | YES | YES | YES | YES |
| OCR receipt | YES | NO | NO | NO |
| Recipes | YES | NO | NO | NO |
| Shopping list from recipe | NO | YES | YES | NO |
| Widget | NO | YES | NO | NO |
| Meal planning | NO | NO | NO | NO |
| List sharing | YES | YES | YES | NO |
| Gamification | YES | NO | NO | NO |

*Note: Too Good To Go solves restaurant surplus, not home inventory — excluded from direct comparison.*

**Unique competitive advantage: inventory + proactive recipes + gamification. No competitor does all three.**

---

## Section 4 — Retention & Engagement

### Strengths
- Double streak system (no-waste + daily) — proven mechanic by Duolingo, Snapchat, GitHub.
- Weekly challenges with `WeeklyChallengeCard` — weekly content renewal, good for D7.
- ProactiveRecipeCard on home — passive push toward core action.
- Push notifications with expo-notifications + server-side edge function.
- Share recap — outbound virality, users share anti-waste stats.
- Referral program — viral acquisition loop.

### Issues

**1. [CONFIRMED BUG] Notification response handler is a no-op.**
In `App.tsx`, `addNotificationResponseListener` is registered but the callback only calls `logger.info()` — there is no navigation logic. A user tapping any push notification lands wherever they were before, not on the relevant screen. The notification payload carries `data: { type: 'expiration_warning', days }` but this data is discarded. Fix: handle notification tap → navigate to relevant screen (or directly to a recipe). This belongs in Sprint 1, not Sprint 2.

**2. No-waste streak is fragile.**
Streak bug fixed in recent commit. Beyond the bug: a streak that breaks due to a missed entry (no food thrown, but user didn't open app) is demotivating. Duolingo has "streak freeze." ZeroGaspy equivalent: "You didn't open the app yesterday but your no-waste score continues" because absence of action = no waste.

**3. No structured weekly retention loop.**
High-retention apps have a weekly ritual: Duolingo sends a Sunday recap, Strava shows week stats Monday morning. ZeroGaspy should send each Sunday evening: "This week you saved X€, threw 0 items — here's your plan for next week."

**4. No social/leaderboard dimension.**
Gamification is 100% individual. BeReal, Strava, Duolingo showed that social comparison (even light) multiplies retention. A simple leaderboard between members of a shared list would be sufficient.

**5. Streak badges take too long — verify that milestone badges fire correctly.**
`zero_waste_7` requires 7 days of no waste. For streak badges, a new user waits a week — too long. However, milestone badges like `first_food` (id: `first_food`, requirement: 1, 10 XP) exist in `gamificationService.ts` and should fire on the first food added. **Action required: verify that `first_food` and similar milestone badges are actually triggered during `ActiveOnboardingScreen` flow**, not just defined. If they are, the problem is only with streak badges. If they are not triggered, add "Day 1" badges for: first food added, first barcode scan, first recipe viewed.

**6. No strong D1 hook.**
After install and onboarding, what makes the user want to return tomorrow? Need a D+1 notification: "Your streak is going! X items expire in 3 days" — the most important push notification in the user's entire lifetime with the app.

**7. Referral not visible enough.**
If referral is only accessible from Settings/Account, nobody sees it. Best referral programs (Uber, Dropbox) are accessible from home or after a strong emotional moment (first food saved, first badge).

### Target Retention Model
```
D1  -> Onboarding + first aha moment (recipe suggested from inventory)
D2  -> Push "Your streak continues, 1 item expiring soon"
D7  -> First badge unlocked + weekly recap
D14 -> Weekly challenge completed + share recap
D30 -> Level 2 unlocked + referral prominently surfaced
```

---

## Section 5 — Security

### Strengths
- SecureStore for auth tokens — Supabase tokens stored in iOS keychain / Android keystore. Correct practice.
- Graceful fallback to AsyncStorage for values > 2048 bytes.
- ConsentContext for GDPR compliance.
- PostHog on EU endpoint (`eu.i.posthog.com`) — GDPR compliant, data stays in Europe.
- Sentry crash reporting.
- `detectSessionInUrl: false` in Supabase client — prevents token leaks in URL logs.

### Issues

**1. [HIGH] Premium logic is 100% client-side and falsifiable.**
`premiumFeaturesService.ts` stores the free scan credit in AsyncStorage. On a rooted/jailbroken device, anyone can clear this key and get unlimited "free" scans. `canScanReceipt()` check is client-side only. This logic must live in a Supabase Edge Function with server-side validation.

**2. [MEDIUM] Gamification data entirely in AsyncStorage.**
XP, badges, streaks, stats — all local. A user can modify these values. Not critical now (no public leaderboard) but becomes exploitable when social features are added. Gamification data should be mirrored to Supabase with server as source of truth.

**3. [MEDIUM] `console.log` statements in production.**
In `HomeScreen.tsx`:
```ts
console.log('[FORCE SYNC] key:', syncKey, 'done:', done);
console.log('[FORCE SYNC] Starting...');
console.log(`[FORCE SYNC] Result: ${synced} synced, ${errors} errors`);
```
These expose internal information (user ID in sync key) and slow performance in production. Replace with `logger.debug()` guarded by `__DEV__` flag.

**4. [LOW] No certificate pinning.**
Supabase calls can be intercepted by MITM proxy (mitmproxy, Charles Proxy) on hostile networks. Certificate pinning prevents this. Recommended for an app handling personal domestic behavior data.

**5. [LOW] Public API keys bundled in client.**
`EXPO_PUBLIC_POSTHOG_KEY` and Supabase credentials are prefixed `EXPO_PUBLIC_` — bundled in app JS and extractable. Unavoidable for anon Supabase key (by design) but ensure:
- Supabase RLS policies are correctly configured (user can only access their own data)
- PostHog key has write-only permissions, not read access to other users' data

**6. [LOW] No client-side rate limiting visible.**
Spamming the receipt scan button could saturate the Mindee API. Supabase Edge Functions should have rate limiting. Verify on backend.

**Overall risk level: Medium-Low** at 50 downloads. Vulnerabilities #1 and #2 become critical when social features or scaled monetization are added. Priority: fix #1 and #3 first.

---

## Section 6 — Architecture & Code Quality

### Strengths
- TypeScript throughout with strong typing, minimal `any`.
- Clean service layer — business logic in `services/`, not in components.
- Centralized design system — single source of visual truth.
- ErrorBoundary — contained crashes, no white screen of death.
- Logger utility — proper `console.log` abstraction.
- `useMemo` / `useCallback` used correctly in HomeScreen for expensive calculations.
- `React.memo` on heavy components (`BackgroundDecoration`, `LogoSection`).
- SecureStore adapter cleanly abstracted.

### Issues

**1. `HomeScreen.tsx` is a God Component.**
Responsibilities: force sync Supabase, 3 independent animations, list loading, expiration calculations, feedback modal, background decoration, logo section, stats cards, weekly challenge, spaces grid, recipe card. If you add a feature, you touch this file. If it bugs, the entire home is down. Split into custom hooks (`useHomeSync`, `useExpiringItems`) and sub-components.

**2. Hardcoded recipe database is a maintainability problem.**
To add 10 recipes: modify the file, rebuild, submit to App Store, wait for review. On Supabase, modify a table and it's live instantly. Migrate `RECIPES_DATABASE` to Supabase.

**3. No caching layer for Supabase.**
Each `useFocusEffect` reloads lists from AsyncStorage. Supabase calls lack visible caching — on each sync, everything is refetched. React Query or SWR would handle cache, stale-while-revalidate, and automatic retries better than current manual implementation.

**4. Local/cloud sync is fragile.**
`local_id` (timestamp `Date.now()`) <-> UUID Supabase via `getCloudListId()` is a custom mapping that can desync when user installs app on 2 devices. Modern apps use client-generated UUIDs from creation time, not timestamps.

**5. Test coverage incomplete — gamification and date utils untested.**
6 test files exist in `__tests__/services/` covering `recipeService`, `notificationService`, `receiptScannerService`, `exportService`, `iconService`, `statsService`. However `gamificationService.ts` and `dateUtils.ts` — two of the most complex and regression-prone modules — have no tests. For an app where streak bugs have already appeared in production (see recent commits), this is a concrete risk.

**6. Navigation duplication.**
Deep links defined in `App.tsx` and likely in `AppNavigator`. Centralize in one place.

**7. `console.error` in `supabase.ts` in production.**
```ts
console.error('Supabase credentials not configured!');
```
If credentials are missing, Sentry should capture the error, not just log it.

**Overall technical debt: Low to Medium.** Clean foundation. Issues are "growth debt" — normal at this stage — not "negligence debt." Priority: custom hooks for HomeScreen, migrate recipes to Supabase.

---

## Section 7 — Monetization

### Strengths
- Freemium with generous free tier — correct strategy for early-stage acquisition.
- Receipt scan as premium gate — high-perceived-value feature, well chosen.
- 1 free scan/month for free users — good balance for demonstrating value.
- Bonus scans via referral — aligns monetization + viral acquisition intelligently.
- Google Mobile Ads — passive revenue for free users.
- PaywallModal with source tracking (`trackPaywallViewed(source)`) — will show which surface converts best.

### Issues

**1. Single premium feature = low perceived value.**
If a user never scans receipts (many shop online or without receipts), they have no reason to pay. Apps with good premium conversion have 3-5 gated features covering different use cases.

Recommended premium features to add:

| Feature | Justification |
|---|---|
| OCR receipt scan | Already done |
| Advanced stats (historical graphs, annual savings) | Strong emotional value |
| Exclusive premium recipes | Differentiating content |
| iOS/Android widgets | High demand, hard to copy |
| CSV/PDF data export (gate existing `exportService.ts` feature) | Power users — already implemented, zero dev cost to gate |
| Shared lists with more than 2 members | Family/roommates |

**2. No free premium trial.**
Mobile SaaS apps with best conversion offer 7 or 14 days free (no CC required). Trial-to-paid conversion rate is typically 20-40%. Current paywall is a wall, not a "taste first." Duolingo Plus, Headspace, MyFitnessPal Premium all use trials.

**3. Annual pricing not prominent.**
Annual subscription at ~50% discount vs monthly converts well because it removes monthly decision friction. Many users prefer paying once and forgetting. Apple facilitates this with StoreKit 2.

**4. Ads interrupt experience without perceived value.**
`AdBanner` + `incrementActionCount` suggests interstitials after actions. On a daily management app, ads create frustration. "Remove ads by going premium" model works but creates a negative baseline experience. Consider restricting to non-critical screens only.

**5. No well-defined "premium moment."**
When does the paywall appear? Ideally immediately after a strong emotional moment — when the user sees they saved 20€, or tries to scan their 2nd receipt of the month. Paywall context matters as much as the paywall itself.

### Benchmark Pricing
- Bring! Premium: 1.99€/month or 9.99€/year
- Yummly Premium: 2.99€/month
- OurGroceries: 4.99€ one-time

**Recommendation for ZeroGaspy: 1.99-2.99€/month or 14.99€/year with 14-day trial.**

---

## Prioritized Roadmap

### Sprint 1 — Activation (Weeks 1-2)
*Goal: keep the current 50 users*

1. **Fix notification response handler** — `App.tsx` no-op listener must navigate to expiring food screen or recipe on tap (confirmed bug)
2. **Verify + wire milestone badges** — confirm `first_food` badge fires during onboarding; add any missing Day 1 badges
3. **D+1 personalized push** — "Your streak continues! X items expire soon"
4. **Immediate aha moment** — show potential savings value on first food added
5. **Remove production `console.log` + move premium logic to Edge Function**
6. **OnboardingScreen architecture decision** — decide: remove passive slides (`OnboardingScreen.tsx`) entirely and start directly on `ActiveOnboardingScreen`, OR merge the two into a single flow. This must be resolved before any onboarding work begins.

### Sprint 2 — Retention (Weeks 3-6)
*Goal: D7 > 30%*

5. **Deep-linked expiration notifications** — food name + direct recipe link
6. **Streak freeze mechanic** for no-waste streak
7. **Sunday evening weekly recap** push notification
8. **Referral visible from home** after first badge unlock

### Sprint 3 — Growth (Months 2-3)
*Goal: active viral loops*

9. **Shopping list from recipe** — recipe -> purchase -> inventory -> recipe loop
10. **Migrate recipes to Supabase** — dynamic content, A/B testing
11. **14-day premium trial** + 2nd premium feature gated (advanced stats)
12. **iOS/Android widget**

### Sprint 4 — Scale (Months 3-6)
*Goal: architecture ready for growth*

13. **Expand test coverage** — add tests for `gamificationService.ts` and `dateUtils.ts` (streak logic especially)
14. **React Query** for Supabase caching
15. **Basic meal planning**
16. **Family/friends leaderboard**

---

## Key Competitive Insight

ZeroGaspy's moat is the combination **inventory tracking + proactive AI-matched recipes + gamification**. No competitor does all three. The entire product strategy should reinforce this loop:

```
Add food -> See recipe using what's expiring -> Cook it -> Zero waste -> Badge/XP -> Add more food
```

Every feature added should strengthen one link in this chain.

