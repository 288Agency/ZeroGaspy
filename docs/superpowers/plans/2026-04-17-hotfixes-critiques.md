# Hotfixes Critiques — Audit 2026-04-17

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 5 bugs critiques/hauts et la faille de sécurité haute identifiés dans l'audit du 2026-04-17.

**Architecture:** Corrections ciblées fichier par fichier, sans refactoring. Chaque tâche est indépendante et committable séparément.

**Tech Stack:** React Native + TypeScript, Supabase Edge Functions (Deno/TypeScript), Jest

---

## Vue d'ensemble des fichiers

| Fichier | Modification |
|---|---|
| `supabase/functions/grant-referral-premium/index.ts` | SEC-01 : ajouter vérification JWT |
| `contexts/GamificationContext.tsx` | BUG-02 : ajouter `isPremium` aux deps useEffect |
| `services/referralService.ts` | BUG-03 : déplacer clearPendingReferralCode après vérification |
| `services/supabase/recipeSyncService.ts` | BUG-04 : ignorer UPDATE si DELETE pending |
| `services/aiRecipeService.ts` | H5 : ajouter timeout AbortController |
| `plugins/withIOSWidget.js` | H4 : corriger CodeSignOnCopy + copie fichiers Swift |
| `__tests__/services/monthlySavingsService.test.ts` | Vérification BUG-01 (faux positif) |

---

## Task 0 — Vérifier BUG-01 (faux positif suspecté)

**Files:**
- Run: `__tests__/services/monthlySavingsService.test.ts`

Le rapport d'audit signale `getMonthlyWasted` comme retournant toujours 0 (BUG-01). Cependant, `localStorage.ts:287-288` montre que `consumedAt` est bien défini pour les items `thrown`. Les tests existants couvrent ce cas. Vérifier avant toute modification.

- [ ] **Étape 1 : Lancer les tests existants**

```bash
npx jest __tests__/services/monthlySavingsService.test.ts --no-coverage
```

Expected : PASS (4 tests). Si FAIL → un vrai bug existe, à analyser avant de continuer.

- [ ] **Étape 2 : Si PASS, pas de code à modifier pour BUG-01**

BUG-01 est un faux positif dans l'audit. `consumedAt` est correctement défini pour les items thrown. Continuer avec Task 1.

---

## Task 1 — SEC-01 : Authentifier grant-referral-premium

**Sévérité : 🔴 CRITIQUE — À faire en premier**

**Files:**
- Modify: `supabase/functions/grant-referral-premium/index.ts`

**Problème :** La fonction accepte `referrer_id` du body sans aucune vérification d'authentification. N'importe qui connaissant l'URL + un UUID valide peut accorder du premium. La fonction utilise le service role key (accès total Supabase).

**Solution :** Vérifier que la requête porte un JWT valide via le client Supabase anon avant tout traitement.

- [ ] **Étape 1 : Modifier l'Edge Function**

Remplacer le bloc `try {` de `supabase/functions/grant-referral-premium/index.ts` par :

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFERRALS_NEEDED = 3;
const GRANT_DURATION_MONTHS = 1;
const ENTITLEMENT_ID = 'Zerogaspy Pro';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────────────────────────────────
    // referrer_id est dérivé côté serveur depuis la table referrals —
    // jamais du body. Le filleul (user.id) a forcément un referral completed;
    // c'est le referrer_id de ce referral qui reçoit le premium.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: referralRow, error: refError } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referee_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (refError || !referralRow) {
      return new Response(JSON.stringify({ error: 'No completed referral found for this user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referrer_id: string = referralRow.referrer_id;

    // Compter les referrals complétés
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', referrer_id)
      .eq('status', 'completed');

    if ((count ?? 0) < REFERRALS_NEEDED) {
      return new Response(JSON.stringify({
        success: false,
        reason: 'not_enough_referrals',
        current: count ?? 0,
        needed: REFERRALS_NEEDED,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier si on a déjà accordé le bonus pour ce jalon
    const milestone = Math.floor((count ?? 0) / REFERRALS_NEEDED);
    const { data: alreadyGranted } = await supabase
      .from('referral_premium_grants')
      .select('id')
      .eq('user_id', referrer_id)
      .eq('milestone', milestone)
      .maybeSingle();

    if (alreadyGranted) {
      return new Response(JSON.stringify({ success: false, reason: 'already_granted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rcApiKey = Deno.env.get('REVENUECAT_SECRET_KEY');
    if (!rcApiKey) {
      return new Response(JSON.stringify({ error: 'REVENUECAT_SECRET_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresDate = new Date();
    expiresDate.setMonth(expiresDate.getMonth() + GRANT_DURATION_MONTHS);

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${referrer_id}/entitlements/${ENTITLEMENT_ID}/promotional`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rcApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: 'monthly',
          start_time_ms: Date.now(),
        }),
      }
    );

    if (!rcRes.ok) {
      const err = await rcRes.text();
      console.error('RevenueCat grant error:', err);
      return new Response(JSON.stringify({ error: 'RevenueCat grant failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('referral_premium_grants').insert({
      user_id: referrer_id,
      milestone,
      granted_at: new Date().toISOString(),
      expires_at: expiresDate.toISOString(),
    });

    return new Response(JSON.stringify({ success: true, expires_at: expiresDate.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('grant-referral-premium error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Étape 2 : Vérifier que le client envoie bien le header Auth**

Dans `services/referralService.ts`, la fonction `completeReferral` appelle :
```ts
supabase.functions.invoke('grant-referral-premium', {
  body: { referrer_id: result.referrer_id },
})
```
`supabase.functions.invoke` envoie automatiquement l'Authorization header de la session active. Aucune modification nécessaire côté client.

- [ ] **Étape 3 : Déployer la fonction**

```bash
npx supabase functions deploy grant-referral-premium --project-ref jiyhldfgztzknkccuidq
```

Expected output : `Deployed grant-referral-premium`

- [ ] **Étape 4 : Commit**

```bash
git add supabase/functions/grant-referral-premium/index.ts
git commit -m "fix(security): require JWT auth on grant-referral-premium edge function"
```

---

## Task 2 — BUG-02 : GamificationContext stale closure isPremium

**Files:**
- Modify: `contexts/GamificationContext.tsx:105`

**Problème :** Le `useEffect` qui initialise la gamification a `[user, isLocalMode]` comme dépendances. `isPremium` est utilisé dans `onDailyVisit(isPremium)` mais absent du tableau. Si l'utilisateur achète premium après le premier mount, `onDailyVisit` s'exécute avec `isPremium = false`.

- [ ] **Étape 1 : Corriger le tableau de dépendances**

Dans `contexts/GamificationContext.tsx`, ligne 105, changer :

```typescript
  }, [user, isLocalMode]);
```

en :

```typescript
  }, [user, isLocalMode, isPremium]);
```

- [ ] **Étape 2 : Vérifier qu'il n'y a pas d'autres usages stale**

Inspecter le corps du `useEffect` (lignes 70-104) : seul `isPremium` est utilisé depuis le scope externe sans être dans les dépendances. La correction est complète.

- [ ] **Étape 3 : Commit**

```bash
git add contexts/GamificationContext.tsx
git commit -m "fix: ajouter isPremium aux dependances useEffect GamificationContext"
```

---

## Task 3 — BUG-03 : referralService — effacement code pending prématuré

**Files:**
- Modify: `services/referralService.ts:124-166`

**Problème :** `clearPendingReferralCode()` est appelé à la ligne 136, avant la vérification `if (error)` à la ligne 138. Si le RPC retourne une erreur applicative, le code est effacé et le referral ne peut plus jamais être retenté.

**Solution :** Déplacer l'effacement du code après la vérification d'erreur. L'effacer dès que le RPC répond (succès ou échec business) mais PAS en cas d'erreur réseau.

- [ ] **Étape 1 : Modifier `completeReferral`**

Remplacer les lignes 131-166 de `services/referralService.ts` par :

```typescript
    const { data, error } = await supabase.rpc('complete_referral', {
      p_referee_id: userId,
      p_code: pendingCode,
    });

    if (error) {
      logger.error('Error completing referral:', error);
      // Ne PAS effacer le code — erreur réseau, on peut réessayer
      return { success: false, reason: error.message };
    }

    // Le RPC a répondu (succès ou échec business) : effacer le code pending
    // pour éviter les doubles appels
    await clearPendingReferralCode();

    const result = data as { success: boolean; reason?: string; referrer_id?: string };

    if (result.success) {
      await syncBonusScanCredits(userId);
      trackReferralCompleted(result.referrer_id ?? '');
      logger.info('Referral completed successfully');

      if (result.referrer_id) {
        supabase.functions.invoke('grant-referral-premium', {
          body: { referrer_id: result.referrer_id },
        }).then(({ error: grantError }) => {
          if (grantError) logger.warn('grant-referral-premium error:', grantError);
          else logger.info('Referral premium grant attempted for', result.referrer_id);
        });
      }
    }

    return { success: result.success, reason: result.reason };
  } catch (error) {
    logger.error('Error in completeReferral:', error);
    return { success: false, reason: 'unknown_error' };
  }
}
```

- [ ] **Étape 2 : Commit**

```bash
git add services/referralService.ts
git commit -m "fix: effacer le code referral pending apres confirmation RPC uniquement"
```

---

## Task 4 — BUG-04 : recipeSyncService — UPDATE après DELETE dans la queue

**Files:**
- Modify: `services/supabase/recipeSyncService.ts:112-127`

**Problème :** La logique de fusion UPDATE dans la queue utilise `findIndex` sur tous les items du recipeId, y compris les items `DELETE`. Si un DELETE est en queue et qu'un UPDATE arrive, le payload DELETE est corrompu par le merge.

**Solution :** Exclure les DELETE du merge. Si un DELETE est pending pour cette recette, ignorer silencieusement le UPDATE (la recette sera supprimée de toute façon).

- [ ] **Étape 1 : Écrire le test qui capture le bug**

Ajouter dans `__tests__/services/recipeSyncService.test.ts` (créer si inexistant) :

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToRecipeSyncQueue } from '../../services/supabase/recipeSyncService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('addToRecipeSyncQueue', () => {
  const userId = 'user-123';
  const recipeId = 'recipe-abc';
  const queueKey = `supabase_recipe_sync_queue_${userId}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignore un UPDATE si un DELETE est deja en queue pour la meme recette', async () => {
    const existingQueue = [{
      id: '1',
      operation: 'DELETE',
      recipeId,
      payload: {},
      createdAt: '2026-04-17T10:00:00Z',
      retryCount: 0,
    }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await addToRecipeSyncQueue(userId, 'UPDATE', recipeId, { name: 'Nouvelle recette' });

    // La queue ne doit pas avoir été modifiée (setItem non appelé)
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('merge un UPDATE dans un INSERT existant', async () => {
    const existingQueue = [{
      id: '1',
      operation: 'INSERT',
      recipeId,
      payload: { name: 'Ancienne', ingredients: ['a'] },
      createdAt: '2026-04-17T10:00:00Z',
      retryCount: 0,
    }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await addToRecipeSyncQueue(userId, 'UPDATE', recipeId, { name: 'Nouvelle' });

    const saved = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const queue = JSON.parse(saved);
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe('INSERT');
    expect(queue[0].payload.name).toBe('Nouvelle');
    expect(queue[0].payload.ingredients).toEqual(['a']); // préservé
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx jest __tests__/services/recipeSyncService.test.ts --no-coverage
```

Expected : FAIL sur "ignore un UPDATE si un DELETE est deja en queue"

- [ ] **Étape 3 : Corriger `addToRecipeSyncQueue`**

Dans `services/supabase/recipeSyncService.ts`, remplacer le bloc `if (operation === 'UPDATE')` (lignes 112-137) par :

```typescript
  if (operation === 'UPDATE') {
    // Si un DELETE est déjà en queue pour cette recette, ignorer le UPDATE :
    // la recette sera supprimée de toute façon.
    const pendingDeleteIdx = queue.findIndex(
      item => item.recipeId === recipeId && item.operation === 'DELETE'
    );
    if (pendingDeleteIdx >= 0) {
      return; // recette déjà en queue pour suppression, ignorer l'UPDATE
    }

    // Merge dans un INSERT ou UPDATE existant
    const existingIdx = queue.findIndex(
      item => item.recipeId === recipeId && item.operation !== 'DELETE'
    );
    if (existingIdx >= 0) {
      queue[existingIdx].payload = { ...queue[existingIdx].payload, ...payload };
      queue[existingIdx].createdAt = new Date().toISOString();
    } else {
      queue.push({
        id: Date.now().toString(),
        operation,
        recipeId,
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
    }
  } else {
```

- [ ] **Étape 4 : Lancer les tests — vérifier PASS**

```bash
npx jest __tests__/services/recipeSyncService.test.ts --no-coverage
```

Expected : PASS (2 tests)

- [ ] **Étape 5 : Commit**

```bash
git add services/supabase/recipeSyncService.ts __tests__/services/recipeSyncService.test.ts
git commit -m "fix: ignorer UPDATE apres DELETE pending dans recipeSyncQueue"
```

---

## Task 5 — H5 : AI recipe — ajouter timeout

**Files:**
- Modify: `services/aiRecipeService.ts:15-59`

**Problème :** `supabase.functions.invoke` sans timeout. Si OpenAI est lent (cold start, rate limit), l'UI se bloque indéfiniment.

**Solution :** `AbortController` avec 15 secondes de timeout. En cas de timeout, retourner `null` (le caller affiche un fallback).

- [ ] **Étape 1 : Écrire le test de timeout**

Ajouter dans `__tests__/services/aiRecipeService.test.ts` (créer) :

```typescript
import { generateAIRecipe } from '../../services/aiRecipeService';
import { supabase } from '../../config/supabase';

jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  default: { error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../i18n', () => ({
  default: { language: 'fr' },
}));

describe('generateAIRecipe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne null si la liste d\'ingredients est vide', async () => {
    const result = await generateAIRecipe([]);
    expect(result).toBeNull();
  });

  it('retourne null en cas d\'erreur edge function', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('Function error'),
    });
    const result = await generateAIRecipe(['poulet', 'courgettes']);
    expect(result).toBeNull();
  });

  it('retourne une recette normalisee en cas de succes', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        recipe: {
          name: 'Poulet aux courgettes',
          description: 'Recette test',
          ingredients: ['poulet', 'courgettes'],
          preparationTime: 30,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍗',
          instructions: ['Cuire le poulet'],
        },
        cached: false,
      },
      error: null,
    });
    const result = await generateAIRecipe(['poulet', 'courgettes']);
    expect(result).not.toBeNull();
    expect(result?.recipe.name).toBe('Poulet aux courgettes');
    expect(result?.cached).toBe(false);
    expect(result?.recipe.id).toMatch(/^ai_/);
  });
});
```

- [ ] **Étape 2 : Lancer les tests — vérifier PASS**

```bash
npx jest __tests__/services/aiRecipeService.test.ts --no-coverage
```

Expected : PASS (3 tests) — le timeout n'est pas encore implémenté mais les cas existants doivent passer.

- [ ] **Étape 3 : Ajouter le timeout dans `generateAIRecipe`**

Remplacer le contenu de `services/aiRecipeService.ts` par :

```typescript
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { Recipe } from './recipeService';
import i18n from '../i18n';

export interface AIRecipeResult {
  recipe: Recipe;
  cached: boolean;
}

const AI_RECIPE_TIMEOUT_MS = 15_000;

/**
 * Génère une recette IA basée sur les ingrédients fournis (expirés/expirants).
 * Cache côté serveur 24h. Timeout 15s. Fallback null en cas d'erreur.
 */
export async function generateAIRecipe(ingredients: string[]): Promise<AIRecipeResult | null> {
  if (ingredients.length === 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_RECIPE_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-recipe', {
      body: {
        ingredients,
        language: i18n.language ?? 'fr',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) {
      logger.error('AI recipe edge function error:', error);
      return null;
    }

    if (!data?.recipe) {
      logger.warn('AI recipe: empty response');
      return null;
    }

    const raw = data.recipe;

    const recipe: Recipe = {
      id: `ai_${Date.now()}`,
      name: raw.name ?? 'Recette IA',
      description: raw.description ?? '',
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
      preparationTime: typeof raw.preparationTime === 'number' ? raw.preparationTime : 20,
      difficulty: raw.difficulty ?? 'facile',
      category: raw.category ?? 'plat',
      imageEmoji: raw.imageEmoji ?? '🍳',
      instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
      tips: raw.tips,
      tags: raw.tags,
      isUserRecipe: false,
    };

    return { recipe, cached: data.cached ?? false };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      logger.warn('generateAIRecipe: timeout after 15s');
    } else {
      logger.error('generateAIRecipe error:', error);
    }
    return null;
  }
}
```

- [ ] **Étape 4 : Relancer les tests**

```bash
npx jest __tests__/services/aiRecipeService.test.ts --no-coverage
```

Expected : PASS (3 tests)

- [ ] **Étape 5 : Commit**

```bash
git add services/aiRecipeService.ts __tests__/services/aiRecipeService.test.ts
git commit -m "fix: ajouter timeout 15s sur generateAIRecipe"
```

---

## Task 6 — H4 : Widget iOS — corriger CodeSignOnCopy + idempotence fichiers Swift

**Files:**
- Modify: `plugins/withIOSWidget.js:45`, `plugins/withIOSWidget.js:147`

**Problème 1 :** Les fichiers Swift ne sont copiés que s'ils n'existent pas déjà. Tout changement dans `targets/widget/` nécessite une suppression manuelle de `ios/ZeroGaspyWidget/` avant `expo prebuild`.

**Problème 2 :** `ATTRIBUTES: ['RemoveHeadersOnCopy']` est incorrect pour une app extension — doit être `['CodeSignOnCopy']`. Peut causer des problèmes de code signing à la soumission App Store.

**Note :** Ces modifications s'appliquent au prochain `expo prebuild`. Le dossier `ios/` doit être regénéré pour voir l'effet.

- [ ] **Étape 1 : Corriger la copie des fichiers Swift (idempotence)**

Dans `plugins/withIOSWidget.js`, remplacer les lignes 42-48 :

```javascript
    // Copier Info.plist, entitlements et fichiers Swift
    const filesToCopy = [...SWIFT_FILES, 'Info.plist', 'ZeroGaspyWidget.entitlements'];
    for (const file of filesToCopy) {
      const src = path.join(sourceDir, file);
      const dest = path.join(widgetDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }
```

par :

```javascript
    // Copier Info.plist, entitlements et fichiers Swift (toujours écraser)
    const filesToCopy = [...SWIFT_FILES, 'Info.plist', 'ZeroGaspyWidget.entitlements'];
    for (const file of filesToCopy) {
      const src = path.join(sourceDir, file);
      const dest = path.join(widgetDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
```

- [ ] **Étape 2 : Corriger l'attribut CodeSignOnCopy**

Dans `plugins/withIOSWidget.js`, remplacer la ligne 147 :

```javascript
          productFile.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
```

par :

```javascript
          productFile.settings = { ATTRIBUTES: ['CodeSignOnCopy'] };
```

- [ ] **Étape 3 : Commit**

```bash
git add plugins/withIOSWidget.js
git commit -m "fix(widget-ios): CodeSignOnCopy + copie fichiers Swift idempotente"
```

---

## Vérification finale

- [ ] **Lancer tous les tests**

```bash
npx jest --no-coverage
```

Expected : tous PASS. Aucune régression.

- [ ] **Vérifier que la fonction Edge Function est bien déployée**

```bash
npx supabase functions list --project-ref jiyhldfgztzknkccuidq
```

Expected : `grant-referral-premium` avec un timestamp récent.

---

## Résumé des commits attendus

```
fix(security): require JWT auth on grant-referral-premium edge function
fix: ajouter isPremium aux dependances useEffect GamificationContext
fix: effacer le code referral pending apres confirmation RPC uniquement
fix: ignorer UPDATE apres DELETE pending dans recipeSyncQueue
fix: ajouter timeout 15s sur generateAIRecipe
fix(widget-ios): CodeSignOnCopy + copie fichiers Swift idempotente
```
