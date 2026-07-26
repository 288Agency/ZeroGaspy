# Bannières in-app pilotées par Supabase — Design

**Date:** 2026-07-26
**Statut:** Validé (design), prêt pour plan d'implémentation

## Objectif

Afficher des messages in-app (bannière discrète) sans resoumettre l'app à Apple/Google.
Le socle (table + fetch + composant + logique "déjà vu") est livré **une fois** via un build ;
ensuite le contenu est piloté 100% depuis le dashboard Supabase.

### Cas d'usage
1. **Promo réseaux sociaux** — bannière avec lien externe (tap → ouvre Instagram/TikTok/etc.).
2. **Tips anti-gaspi** — bannière texte seul, informatif.

Les deux partagent le même style visuel (pas de différenciation) ; la présence d'un lien
(`action_url`) suffit à distinguer une promo d'un tip.

## Décisions de cadrage

| Sujet | Décision |
|-------|----------|
| Format | Bannière discrète, dismissible (pas de modal) |
| Ciblage | Global uniquement (aucun filtre version/premium/plateforme) |
| Répétition | Dismiss **définitif** — mémorisé en local par id de message |
| Action | Lien externe optionnel (`action_url`) au tap |
| Style | Une seule bannière pour promo et tips |
| Emplacement | Overlay racine dans `App.tsx` (bloc authentifié), sœur de `<AppNavigator/>` |

## Modèle de données

Nouvelle migration `supabase/migrations/20260726_app_messages.sql` :

```sql
create table public.app_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  action_url text,            -- optionnel : tap ouvre l'URL
  action_label text,          -- optionnel : libellé du lien (déf. app : "En savoir plus")
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_messages enable row level security;

-- Lecture publique (anon + authenticated) des seuls messages actifs.
create policy "read active messages" on public.app_messages
  for select using (active = true);

-- Aucune policy INSERT/UPDATE/DELETE → seuls le dashboard / service_role écrivent.
```

- `active` défaut `false` → aucun message ne s'affiche par accident.
- Création/activation/désactivation depuis le dashboard Supabase.
- L'app tourne aussi en mode local (non authentifié) : la lecture doit fonctionner pour
  `anon` — c'est le cas via la policy `using (active = true)`.

## Modules client

### `services/appMessagesService.ts`
- `type AppMessage = { id, title, body, action_url?, action_label? }`
- `fetchActiveMessages(): Promise<AppMessage[]>`
  - `supabase.from('app_messages').select('id,title,body,action_url,action_label').eq('active', true).order('created_at', { ascending: false })`
  - **Fail-safe :** try/catch → renvoie `[]` en cas d'erreur réseau/Supabase, `logger.warn` uniquement (jamais de throw, jamais de crash).
- `getDismissedIds(): Promise<string[]>` — lit AsyncStorage clé `dismissed_app_messages` (JSON array). Parse défensif → `[]` si absent/corrompu.
- `markDismissed(id: string): Promise<void>` — ajoute l'id à la liste et réécrit.

### `hooks/useAppMessage.ts`
- Au mount : `fetchActiveMessages()` + `getDismissedIds()` en parallèle.
- Retourne `{ message: AppMessage | null, dismiss: () => void }`.
- `message` = **premier message non-dismissé** (un seul affiché à la fois ; les messages actifs sont triés par `created_at desc`, donc le plus récent d'abord).
- État initial `message = null` → n'empêche jamais le rendu de l'app pendant le fetch async.
- `dismiss()` appelle `markDismissed(current.id)` puis passe au message non-dismissé suivant (ou `null`).

## Rendu — `components/AppMessageBanner.tsx`

- Consomme `useAppMessage()`. Si `message === null` → rend `null`.
- Bannière discrète ancrée en haut, sous la status bar (`useSafeAreaInsets().top`),
  `position: 'absolute'`, `top/left/right: 0`, `zIndex` élevé.
- Contenu : titre (gras) + body + croix de fermeture (appelle `dismiss()`).
- Si `action_url` présent → la zone contenu est tappable, ouvre l'URL via
  `Linking.openURL(action_url)` (catché silencieusement si l'URL est invalide).
  Libellé optionnel `action_label` (défaut "En savoir plus").
- Style via `utils/designSystem.ts` (tokens sage/forêt/crème), animation d'entrée douce
  (slide + fade) réutilisant le pattern de `components/Toast.tsx`.

### Câblage `App.tsx`
Dans le bloc authentifié (return final, actuellement l.349-354) :

```tsx
<NavigationContainer ref={navigationRef} linking={linking} onStateChange={onNavigationStateChange}>
  <AppNavigator />
  <AppMessageBanner />
  <StatusBar style={statusBarStyle} />
</NavigationContainer>
```

Rendu uniquement pour l'utilisateur authentifié **ou en mode local** (pas pendant
onboarding/splash/écran de connexion).

## Gestion d'erreur

- Fetch échoue / hors-ligne → `[]`, aucune bannière, `logger.warn` discret.
- `action_url` invalide → `Linking.openURL` catché, pas de crash.
- Parse AsyncStorage corrompu → `[]`.
- **Invariant :** le système ne peut jamais empêcher l'app de démarrer ni la faire crasher.

## Tests

- `__tests__/appMessagesService.test.ts`
  - `fetchActiveMessages` filtre bien `active=true` et mappe les champs.
  - Erreur réseau → `[]`.
  - `markDismissed` / `getDismissedIds` persistent et relisent correctement ; storage corrompu → `[]`.
- `__tests__/useAppMessage.test.ts`
  - Retourne le premier message non-dismissé.
  - `dismiss()` masque le courant, persiste son id, passe au suivant.
  - Aucun message actif → `message === null`.
- Mock du client Supabase et d'AsyncStorage (patterns existants dans `__mocks__/`).

## Hors périmètre (YAGNI)

Ajoutable plus tard sans casser le socle :
- Ciblage (version / premium / plateforme) — via colonnes + filtres.
- Expiration par date (`start_at` / `end_at`).
- Plusieurs bannières simultanées / carrousel.
- Type modal plein écran.
- Différenciation visuelle promo vs tip (colonne `category`).
