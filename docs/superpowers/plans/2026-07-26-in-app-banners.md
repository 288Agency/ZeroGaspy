# Bannières in-app pilotées par Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher une bannière in-app discrète dont le contenu (promo réseaux sociaux + tips anti-gaspi) est piloté depuis Supabase, sans resoumission Apple/Google.

**Architecture:** Table `app_messages` en lecture publique (RLS `active=true`). Un service leaf (`services/appMessagesService.ts`) expose fetch + persistance du "déjà vu" (AsyncStorage) + une fonction pure de sélection. Un hook fin (`hooks/useAppMessage.ts`) orchestre l'état. Un composant overlay (`components/AppMessageBanner.tsx`) rend la bannière, câblé dans `App.tsx` (bloc authentifié uniquement).

**Tech Stack:** React Native + Expo SDK 54, TypeScript, Supabase JS client, AsyncStorage, Jest.

## Global Constraints

- **Aucune nouvelle dépendance npm.** Utiliser uniquement ce qui est déjà installé.
- **Imports conventionnels :** `import { supabase } from '../config/supabase'`, `import logger from '../utils/logger'`, `import AsyncStorage from '@react-native-async-storage/async-storage'`.
- **Tokens de style :** `import { COLORS, RADIUS, SHADOWS } from '../utils/designSystem'`. Aucun hex en dur dans le composant.
- **Fail-safe absolu :** aucune fonction du système ne doit throw vers l'app ni empêcher le démarrage. Toute erreur → valeur de repli (`[]` / `null`) + `logger.warn` uniquement.
- **Copie par défaut en français.** Libellé CTA par défaut : `"En savoir plus"`.
- **Tests :** `__tests__/services/appMessagesService.test.ts`. Jest mocke déjà AsyncStorage globalement (`jest.setup.js`) ; `config/supabase` doit être mocké par test pour éviter la chaîne d'import react-native.
- **Un seul message affiché à la fois**, le plus récent d'abord (tri `created_at desc`).

---

### Task 1: Migration Supabase `app_messages`

**Files:**
- Create: `supabase/migrations/20260726_app_messages.sql`

**Interfaces:**
- Consumes: rien.
- Produces: table `public.app_messages` avec colonnes `id uuid`, `title text`, `body text`, `action_url text?`, `action_label text?`, `active boolean`, `created_at timestamptz`, `updated_at timestamptz` ; policy RLS SELECT `active = true`.

- [ ] **Step 1: Écrire la migration**

Créer `supabase/migrations/20260726_app_messages.sql` :

```sql
-- Bannières in-app pilotées serveur (promo réseaux + tips anti-gaspi).
-- Contenu géré depuis le dashboard Supabase ; aucune resoumission app nécessaire.

create table if not exists public.app_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  action_url text,
  action_label text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_messages enable row level security;

-- Lecture publique (anon + authenticated) des seuls messages actifs.
-- L'app tourne aussi en mode local non authentifié → la lecture doit marcher pour `anon`.
drop policy if exists "read active messages" on public.app_messages;
create policy "read active messages" on public.app_messages
  for select
  using (active = true);

-- Aucune policy INSERT/UPDATE/DELETE : seuls le dashboard / service_role écrivent.
```

- [ ] **Step 2: Vérifier la validité SQL en appliquant la migration**

Appliquer la migration au projet Supabase lié (`jiyhldfgztzknkccuidq`) via l'outil MCP `apply_migration` (name: `app_messages`, query = contenu du fichier), OU via `npx supabase db push` si le CLI est configuré.
Expected: exécution sans erreur ; la table `app_messages` apparaît dans `list_tables`.

- [ ] **Step 3: Vérifier la policy de lecture anon**

Via MCP `execute_sql` (ou dashboard) exécuter :
```sql
select tablename, policyname, cmd from pg_policies where tablename = 'app_messages';
```
Expected: une ligne `read active messages` / `SELECT`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260726_app_messages.sql
git commit -m "feat(db): table app_messages + RLS pour bannières in-app"
```

---

### Task 2: Service — types + sélecteur pur `selectNextMessage`

**Files:**
- Create: `services/appMessagesService.ts`
- Test: `__tests__/services/appMessagesService.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type AppMessage = { id: string; title: string; body: string; action_url?: string | null; action_label?: string | null }`
  - `function selectNextMessage(messages: AppMessage[], dismissedIds: string[]): AppMessage | null`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `__tests__/services/appMessagesService.test.ts` :

```ts
// Mock supabase config pour éviter la chaîne d'import react-native.
jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn() },
}));

import {
  selectNextMessage,
  AppMessage,
} from '../../services/appMessagesService';

function makeMsg(id: string, overrides: Partial<AppMessage> = {}): AppMessage {
  return { id, title: `T${id}`, body: `B${id}`, action_url: null, action_label: null, ...overrides };
}

describe('selectNextMessage', () => {
  it('retourne le premier message non-dismissé', () => {
    const messages = [makeMsg('a'), makeMsg('b'), makeMsg('c')];
    expect(selectNextMessage(messages, ['a'])?.id).toBe('b');
  });

  it('retourne null si tous sont dismissés', () => {
    const messages = [makeMsg('a'), makeMsg('b')];
    expect(selectNextMessage(messages, ['a', 'b'])).toBeNull();
  });

  it('retourne null si la liste est vide', () => {
    expect(selectNextMessage([], [])).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx jest __tests__/services/appMessagesService.test.ts -t selectNextMessage`
Expected: FAIL — module `services/appMessagesService` introuvable / `selectNextMessage` non défini.

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `services/appMessagesService.ts` :

```ts
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

export type AppMessage = {
  id: string;
  title: string;
  body: string;
  action_url?: string | null;
  action_label?: string | null;
};

/** Renvoie le premier message non-dismissé (un seul affiché à la fois), ou null. Pure. */
export function selectNextMessage(
  messages: AppMessage[],
  dismissedIds: string[]
): AppMessage | null {
  const dismissed = new Set(dismissedIds);
  return messages.find((m) => !dismissed.has(m.id)) ?? null;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx jest __tests__/services/appMessagesService.test.ts -t selectNextMessage`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/appMessagesService.ts __tests__/services/appMessagesService.test.ts
git commit -m "feat(messages): AppMessage type + sélecteur pur selectNextMessage"
```

---

### Task 3: Service — persistance du "déjà vu" (`getDismissedIds` / `markDismissed`)

**Files:**
- Modify: `services/appMessagesService.ts`
- Test: `__tests__/services/appMessagesService.test.ts`

**Interfaces:**
- Consumes: AsyncStorage (mocké globalement dans `jest.setup.js`).
- Produces:
  - `const DISMISSED_KEY = 'dismissed_app_messages'`
  - `function getDismissedIds(): Promise<string[]>`
  - `function markDismissed(id: string): Promise<void>`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `__tests__/services/appMessagesService.test.ts` (après le `describe('selectNextMessage')`) :

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDismissedIds, markDismissed } from '../../services/appMessagesService';

describe('getDismissedIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renvoie [] quand rien n\'est stocké', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await getDismissedIds()).toEqual([]);
  });

  it('parse le tableau stocké', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a', 'b']));
    expect(await getDismissedIds()).toEqual(['a', 'b']);
  });

  it('renvoie [] si le contenu est corrompu', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{pas du json');
    expect(await getDismissedIds()).toEqual([]);
  });
});

describe('markDismissed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ajoute l\'id à la liste existante', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a']));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await markDismissed('b');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'dismissed_app_messages',
      JSON.stringify(['a', 'b'])
    );
  });

  it('ne duplique pas un id déjà présent', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['a']));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    await markDismissed('a');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'dismissed_app_messages',
      JSON.stringify(['a'])
    );
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx jest __tests__/services/appMessagesService.test.ts -t "getDismissedIds|markDismissed"`
Expected: FAIL — `getDismissedIds` / `markDismissed` non exportés.

- [ ] **Step 3: Écrire l'implémentation**

Ajouter dans `services/appMessagesService.ts` (sous `selectNextMessage`) :

```ts
const DISMISSED_KEY = 'dismissed_app_messages';

/** Ids des messages déjà fermés par l'utilisateur (persistés localement). */
export async function getDismissedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch (e) {
    logger.warn('[AppMessages] lecture dismissed échouée:', e);
    return [];
  }
}

/** Marque un message comme fermé (dismiss définitif). Idempotent. */
export async function markDismissed(id: string): Promise<void> {
  try {
    const current = await getDismissedIds();
    if (current.includes(id)) return;
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
  } catch (e) {
    logger.warn('[AppMessages] écriture dismissed échouée:', e);
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx jest __tests__/services/appMessagesService.test.ts -t "getDismissedIds|markDismissed"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add services/appMessagesService.ts __tests__/services/appMessagesService.test.ts
git commit -m "feat(messages): persistance dismiss définitif (AsyncStorage)"
```

---

### Task 4: Service — `fetchActiveMessages`

**Files:**
- Modify: `services/appMessagesService.ts`
- Test: `__tests__/services/appMessagesService.test.ts`

**Interfaces:**
- Consumes: `supabase.from('app_messages').select(...).eq('active', true).order('created_at', { ascending: false })`.
- Produces: `function fetchActiveMessages(): Promise<AppMessage[]>`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter dans `__tests__/services/appMessagesService.test.ts` :

```ts
import { supabase } from '../../config/supabase';
import { fetchActiveMessages } from '../../services/appMessagesService';

// Construit un mock chaînable pour supabase.from(...).select(...).eq(...).order(...)
function mockFrom(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ select });
  return { order, eq, select };
}

describe('fetchActiveMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('filtre active=true, trie par created_at desc, et mappe les lignes', async () => {
    const rows = [
      { id: 'a', title: 'T', body: 'B', action_url: 'https://x', action_label: 'Go' },
    ];
    const { select, eq, order } = mockFrom({ data: rows, error: null });

    const result = await fetchActiveMessages();

    expect(supabase.from).toHaveBeenCalledWith('app_messages');
    expect(select).toHaveBeenCalledWith('id,title,body,action_url,action_label');
    expect(eq).toHaveBeenCalledWith('active', true);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(rows);
  });

  it('renvoie [] en cas d\'erreur supabase', async () => {
    mockFrom({ data: null, error: { message: 'boom' } });
    expect(await fetchActiveMessages()).toEqual([]);
  });

  it('renvoie [] si data est null', async () => {
    mockFrom({ data: null, error: null });
    expect(await fetchActiveMessages()).toEqual([]);
  });

  it('renvoie [] si la requête throw', async () => {
    (supabase.from as jest.Mock).mockImplementation(() => {
      throw new Error('network');
    });
    expect(await fetchActiveMessages()).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx jest __tests__/services/appMessagesService.test.ts -t fetchActiveMessages`
Expected: FAIL — `fetchActiveMessages` non exporté.

- [ ] **Step 3: Écrire l'implémentation**

Ajouter dans `services/appMessagesService.ts` (sous les types) :

```ts
/** Récupère les messages actifs (plus récent d'abord). Fail-safe → [] en cas d'erreur. */
export async function fetchActiveMessages(): Promise<AppMessage[]> {
  try {
    const { data, error } = await supabase
      .from('app_messages')
      .select('id,title,body,action_url,action_label')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('[AppMessages] fetch échoué:', error.message);
      return [];
    }
    return (data ?? []) as AppMessage[];
  } catch (e) {
    logger.warn('[AppMessages] fetch a levé une exception:', e);
    return [];
  }
}
```

- [ ] **Step 4: Lancer toute la suite du service**

Run: `npx jest __tests__/services/appMessagesService.test.ts`
Expected: PASS (toutes les descriptions : selectNextMessage, getDismissedIds, markDismissed, fetchActiveMessages).

- [ ] **Step 5: Commit**

```bash
git add services/appMessagesService.ts __tests__/services/appMessagesService.test.ts
git commit -m "feat(messages): fetchActiveMessages depuis Supabase (fail-safe)"
```

---

### Task 5: Hook `useAppMessage`

**Files:**
- Create: `hooks/useAppMessage.ts`

**Interfaces:**
- Consumes: `fetchActiveMessages`, `getDismissedIds`, `markDismissed`, `selectNextMessage`, `AppMessage` (Task 2-4).
- Produces: `function useAppMessage(): { message: AppMessage | null; dismiss: () => void }`

> Note : pas de test unitaire de hook (aucune infra `@testing-library` et aucun test de hook dans le repo — voir Global Constraints). Toute la logique testable est déjà couverte par la fonction pure `selectNextMessage` (Task 2). Le hook est un simple orchestrateur, vérifié par le typage TS et l'intégration au runtime.

- [ ] **Step 1: Écrire le hook**

Créer `hooks/useAppMessage.ts` :

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppMessage,
  fetchActiveMessages,
  getDismissedIds,
  markDismissed,
  selectNextMessage,
} from '../services/appMessagesService';

/**
 * Charge les messages actifs au montage, écarte ceux déjà fermés, et expose
 * le message courant + une action `dismiss` (dismiss définitif, passe au suivant).
 */
export function useAppMessage(): { message: AppMessage | null; dismiss: () => void } {
  const [message, setMessage] = useState<AppMessage | null>(null);
  const messagesRef = useRef<AppMessage[]>([]);
  const dismissedRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [messages, dismissed] = await Promise.all([
        fetchActiveMessages(),
        getDismissedIds(),
      ]);
      if (cancelled) return;
      messagesRef.current = messages;
      dismissedRef.current = dismissed;
      setMessage(selectNextMessage(messages, dismissed));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setMessage((current) => {
      if (!current) return null;
      void markDismissed(current.id);
      dismissedRef.current = [...dismissedRef.current, current.id];
      return selectNextMessage(messagesRef.current, dismissedRef.current);
    });
  }, []);

  return { message, dismiss };
}
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: pas d'erreur liée à `hooks/useAppMessage.ts` ni à `services/appMessagesService.ts`.

- [ ] **Step 3: Commit**

```bash
git add hooks/useAppMessage.ts
git commit -m "feat(messages): hook useAppMessage (orchestration fetch + dismiss)"
```

---

### Task 6: Composant `AppMessageBanner`

**Files:**
- Create: `components/AppMessageBanner.tsx`

**Interfaces:**
- Consumes: `useAppMessage` (Task 5), `COLORS/RADIUS/SHADOWS` (`utils/designSystem`), `Linking` (react-native), `useSafeAreaInsets` (react-native-safe-area-context).
- Produces: `export default function AppMessageBanner(): JSX.Element | null`

- [ ] **Step 1: Écrire le composant**

Créer `components/AppMessageBanner.tsx` :

```tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS } from '../utils/designSystem';
import { useAppMessage } from '../hooks/useAppMessage';
import logger from '../utils/logger';

const DEFAULT_ACTION_LABEL = 'En savoir plus';

export default function AppMessageBanner(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { message, dismiss } = useAppMessage();
  const translateY = useRef(new Animated.Value(-140)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      translateY.setValue(-140);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [message, translateY, opacity]);

  if (!message) return null;

  const hasLink = !!message.action_url;

  const openLink = async () => {
    if (!message.action_url) return;
    try {
      await Linking.openURL(message.action_url);
    } catch (e) {
      logger.warn('[AppMessages] ouverture URL échouée:', e);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        activeOpacity={hasLink ? 0.85 : 1}
        onPress={hasLink ? openLink : undefined}
        disabled={!hasLink}
      >
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {message.title}
          </Text>
          <Text style={styles.body} numberOfLines={3}>
            {message.body}
          </Text>
          {hasLink ? (
            <Text style={styles.action}>
              {message.action_label || DEFAULT_ACTION_LABEL} ↗
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.close}
        onPress={dismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Fermer"
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    borderWidth: 1,
    borderColor: COLORS.neutral.grayBorder,
    ...SHADOWS.lg,
  },
  inner: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  textContainer: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  body: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  action: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  close: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 15,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: pas d'erreur liée à `components/AppMessageBanner.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/AppMessageBanner.tsx
git commit -m "feat(messages): composant AppMessageBanner (overlay dismissible + CTA)"
```

---

### Task 7: Câbler la bannière dans `App.tsx`

**Files:**
- Modify: `App.tsx` (import + bloc de rendu authentifié, actuellement lignes ~349-354)

**Interfaces:**
- Consumes: `AppMessageBanner` (Task 6).
- Produces: rien (intégration terminale).

- [ ] **Step 1: Ajouter l'import**

Dans `App.tsx`, avec les autres imports de composants (ex. près de `import AppNavigator from './navigation/AppNavigator';`), ajouter :

```tsx
import AppMessageBanner from './components/AppMessageBanner';
```

- [ ] **Step 2: Rendre la bannière dans le bloc authentifié**

Remplacer le return final du bloc authentifié :

```tsx
  // Utilisateur authentifié ou en mode local, afficher l'app principale
  return (
    <NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
      <AppNavigator />
      <StatusBar style={statusBarStyle} />
    </NavigationContainer>
  );
```

par :

```tsx
  // Utilisateur authentifié ou en mode local, afficher l'app principale
  return (
    <NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
      <AppNavigator />
      <AppMessageBanner />
      <StatusBar style={statusBarStyle} />
    </NavigationContainer>
  );
```

> Ne PAS ajouter la bannière dans le bloc `!isAuthenticated` (écran de connexion) ni pendant onboarding/splash. Uniquement le bloc authentifié / mode local ci-dessus.

- [ ] **Step 3: Vérifier le typage et les tests**

Run: `npx tsc --noEmit && npx jest __tests__/services/appMessagesService.test.ts`
Expected: pas d'erreur TS ; tests du service PASS.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(messages): monter AppMessageBanner dans le bloc authentifié"
```

---

## Vérification manuelle finale (après Task 7)

1. Dans le dashboard Supabase → table `app_messages`, insérer une ligne :
   `title="Suivez-nous 🎉"`, `body="Retrouvez nos astuces sur Instagram"`, `action_url="https://instagram.com/toncompte"`, `active=true`.
2. Lancer l'app (`npx expo start`) → la bannière apparaît en haut, tap → ouvre l'URL.
3. Fermer (✕) → elle disparaît et ne réapparaît plus après relance (dismiss définitif).
4. Passer `active=false` dans Supabase → aucune bannière au prochain lancement.
5. Insérer une ligne sans `action_url` (tip) → bannière texte seul, non tappable, croix fonctionne.

## Mise à jour Notion (règle CLAUDE.md)

Après merge : ajouter une entrée dans la base Versions (Type `Feature`, description "Bannières in-app pilotées Supabase") et marquer toute tâche correspondante "Terminé".
