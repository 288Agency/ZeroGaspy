# Spec — HomeScreen Redesign

## Contexte

Le HomeScreen actuel présente 4 problèmes structurels identifiés lors de l'audit design du 2026-04-10 :

1. **Stats dupliquées** : les chiffres (expirent/jetés/frais) apparaissent dans HeroSection (3 pills) ET dans StatsCardsRow (2 grandes cartes colorées). Redondance de ~90–120px.
2. **Hero statique** : "Bonjour ! ZeroGaspy" ne reflète pas l'état réel de l'utilisateur. Aucune réactivité aux données.
3. **Hiérarchie visuelle plate** : HeroSection, StatsCardsRow, WeeklyChallenge, Recipe, Spaces ont le même poids visuel. L'œil ne sait pas où aller.
4. **Cards identiques** : WeeklyChallenge et ProactiveRecipeCard partagent le même style (background sombre / fond crème). Aucune différenciation visuelle immédiate.

---

## Changements validés

### 1. Hero dynamique (fusion HeroSection + StatsCardsRow)

**Supprimer** `StatsCardsRow` du HomeScreen (le fichier composant peut rester, il n'est plus rendu).

**Refondre** `HeroSection` pour être contextuel et dynamique.

#### Props HeroSection (nouvelle interface complète)

```typescript
interface HeroSectionProps {
  urgentCount: number;          // aliments expirant aujourd'hui ou demain (days <= 1)
  expiringSoonCount: number;    // aliments expirant dans <= 3 jours (hors urgentCount)
  thrownCount: number;
  freshCount: number;
  onExpiringSoonPress?: () => void;   // conservé — tap sur la zone stats en état warning/urgent
  onThrownPress?: () => void;         // conservé — tap sur le chiffre jeté
}
```

Les callbacks `onExpiringSoonPress` et `onThrownPress` sont conservés mais optionnels. La zone de stats inline en état `warning`/`urgent` reste tappable (elle navigue vers ExpiringSoon). En état `calm`, pas de navigation depuis le hero.

Le callback `onFeedbackPress` est supprimé — il n'existe plus dans le nouveau design.

#### Logique d'état (priorité décroissante)

| Condition | État | Couleur gradient | Badge | Message principal |
|-----------|------|-----------------|-------|-------------------|
| `urgentCount >= 1` | `urgent` | `#7F1D1D → #DC2626` | "URGENCE" + dot `#FCA5A5` | "X aliments périment aujourd'hui" |
| `expiringSoonCount >= 1` | `warning` | `#C2410C → #F97316` | "ATTENTION REQUISE" + dot `#FCD34D` | "X aliments expirent bientôt" |
| Sinon | `calm` | `COLORS.primary[700] → COLORS.primary[500]` | "TOUT VA BIEN" + dot `#4ADE80` | "Frigo bien géré 🎉" |

**Note sur les couleurs** : les stops `#C2410C`, `#F97316`, `#7F1D1D` sont des valeurs one-off intentionnellement non tokenisées (orange/rouge warning). `#DC2626` correspond à `COLORS.semantic.dangerDark`. Ces 3 valeurs hex sont à définir comme constantes locales dans `HeroSection.tsx`.

#### Stats inline selon état

- État `calm` : `{freshCount} frais`
- État `warning` : `{expiringSoonCount} expirent | {thrownCount} jeté(s) | {freshCount} frais`
- État `urgent` : `{urgentCount} aujourd'hui | {expiringSoonCount} cette sem.`

La ligne de stats est un `TouchableOpacity` wrappant tout le bloc, appelle `onExpiringSoonPress` si défini.

#### Computation dans HomeScreen.tsx

Le champ correct dans le type `FoodItem` est `expirationDate` (camelCase), et les memos suivent le pattern `lists.reduce` déjà utilisé dans le fichier.

**Sémantique des compteurs :**
- `urgentCount` : items avec `days === 0 ou 1` (aujourd'hui ou demain)
- `expiringSoonCount` : items avec `days === 2 ou 3` **exclusivement** (ne pas inclure les urgents)
- Ainsi les deux compteurs sont mutuellement exclusifs — pas de doublon dans les stats affichées

`HomeScreen.tsx` doit ajouter :

```typescript
const urgentCount = useMemo(() => {
  return lists.reduce((sum, list) => {
    return sum + list.items.filter(item => {
      if (item.status === 'consumed' || item.status === 'thrown') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days >= 0 && days <= 1;
    }).length;
  }, 0);
}, [lists]);
```

`expiringSoonCount` est recalculé sur jours 2–3 uniquement (exclusif des urgents) :

```typescript
const expiringSoonCount = useMemo(() => {
  return lists.reduce((sum, list) => {
    return sum + list.items.filter(item => {
      if (item.status === 'consumed' || item.status === 'thrown') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days >= 2 && days <= 3;
    }).length;
  }, 0);
}, [lists]);
```

Le seuil ≤7 jours n'est plus utilisé dans `HomeScreen.tsx` (StatsCardsRow étant retiré).

Le call site `HeroSection` dans HomeScreen.tsx doit : supprimer `onFeedbackPress`, supprimer le state `feedbackModalVisible` et le composant `FeedbackModal` associé (ils ne sont plus déclenchés depuis le hero), ajouter `urgentCount`.

---

### 2. Espaces en scroll horizontal

Remplacer la `SpacesGrid` dans `HomeScreen.tsx` par un `FlatList` horizontal inline (pas un composant séparé — implémenté directement dans le JSX du HomeScreen ou dans un petit composant `SpacesScrollRow`).

#### Comportement

- `horizontal={true}`, `showsHorizontalScrollIndicator={false}`
- Hauteur fixe des cards : 64px
- Largeur card : 120px, padding interne 10px
- Gap entre cards : 8px
- `contentContainerStyle`: `paddingHorizontal: SPACING.md`
- Tri : espaces avec `urgentCount > 0` en premier, puis `expiringSoonCount > 0`, puis les autres (tri stable)

#### Indicateur de scroll (fade droit)

Utiliser un `LinearGradient` en `position: absolute` sur le bord droit du container, avec `pointerEvents="none"` :

```tsx
<LinearGradient
  colors={['transparent', COLORS.surface.background]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32 }}
  pointerEvents="none"
/>
```

`expo-linear-gradient` est déjà installé dans le projet.

#### Style des cards selon urgence

```
calm    : border 1.5px solid rgba(60,110,71,0.12), texte secondaire "X alim.", barre verte
warning : border 1.5px solid rgba(251,146,60,0.35), texte secondaire "X expirent ⚠️" (orange), barre orange
urgent  : border 1.5px solid rgba(220,38,38,0.25), texte secondaire "X périment 🚨" (rouge), barre rouge
```

La barre de progression en bas de la card est décorative — elle représente visuellement l'état de l'espace.

#### Urgence par espace (calcul inline)

Pour chaque card d'espace, l'urgence est calculée en filtrant `list.items` au moment du rendu — pas de props dédiées. Logique :
```typescript
const spaceUrgentCount = list.items.filter(i =>
  i.status !== 'consumed' && i.status !== 'thrown' &&
  getDaysUntilExpiration(i.expirationDate) !== null &&
  getDaysUntilExpiration(i.expirationDate)! <= 1
).length;
const spaceWarnCount = list.items.filter(i =>
  i.status !== 'consumed' && i.status !== 'thrown' &&
  getDaysUntilExpiration(i.expirationDate) !== null &&
  getDaysUntilExpiration(i.expirationDate)! >= 2 &&
  getDaysUntilExpiration(i.expirationDate)! <= 3
).length;
```

#### Empty states

- **0 espaces personnels, 0 espaces partagés** : la section "MES ESPACES" est remplacée par un bouton inline "Créer un espace →" (`TouchableOpacity` avec style secondaire, mène vers la création d'une liste).
- **Espaces partagés** (`SharedListWithMe`) : ils apparaissent dans le scroll après les espaces personnels. Ils n'ont pas de données d'expiration item-level — leur état est toujours `calm` (bordure verte, pas de texte d'alerte).

---

### 3. WeeklyChallengeCard — fond vert clair

Remplacer le fond sombre actuel (`COLORS.primary[700]`) par un fond vert très clair :

- `backgroundColor: '#ECFDF5'` (vert menthe très clair)
- `borderWidth: 1`, `borderColor: 'rgba(60, 110, 71, 0.15)'`
- Supprimer `SHADOWS.colored(...)` → remplacer par `SHADOWS.sm`

Couleurs de texte à mettre à jour :

| Élément | Avant | Après |
|---------|-------|-------|
| Label section | `rgba(255,255,255,0.6)` | `#166534` (vert foncé, bold) |
| Titre challenge | `#FFFFFF` | `COLORS.primary[700]` (`#1F3A27`) |
| Texte progression "1/3" | `rgba(255,255,255,0.7)` | `COLORS.text.tertiary` |
| Barre bg | `rgba(255,255,255,0.2)` | `rgba(60, 110, 71, 0.15)` |
| Barre fill | `getDifficultyColor()` — conservé | conservé (vert, orange, rouge restent lisibles) |
| Chevron icon | `#FFFFFF` | `COLORS.primary[500]` |
| `iconContainer` bg | `rgba(74,222,128,0.15)` | `rgba(60,110,71,0.12)` (vert plus soutenu, lisible sur `#ECFDF5`) |

---

### 4. ProactiveRecipeCard — accent ambre

- Fond : `#FFFFFF` (blanc pur, sans shadow ou shadow légère `SHADOWS.sm`)
- Bordure gauche : `borderLeftWidth: 3, borderLeftColor: '#F59E0B'`
- `borderRadius: RADIUS.md`, `borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.15)'`
- Label "RECETTE SUGGÉRÉE" : `color: '#D97706'`, `fontWeight: '700'`, `letterSpacing: 0.3`

Bouton chevron : le container existant (`View` wrappant l'icône) gagne un fond visible :
- `backgroundColor: '#FEF3C7'`, `borderRadius: RADIUS.sm`, `padding: 6`
- Couleur icône : `#92400E`

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `screens/HomeScreen.tsx` | Ajouter `urgentCount` memo, changer `expiringSoonCount` seuil ≤3j, retirer `StatsCardsRow`, retirer `onFeedbackPress`, ajouter scroll horizontal espaces |
| `components/HeroSection.tsx` | Refonte complète — interface, logique d'état, gradients |
| `components/WeeklyChallengeCard.tsx` | Fond clair + mise à jour de tous les textes et ombres |
| `components/ProactiveRecipeCard.tsx` | Bordure ambre + bouton chevron visible |

`StatsCardsRow.tsx` : non modifié, simplement non rendu dans HomeScreen.

---

## Tokens design utilisés

Tous issus de `utils/designSystem.ts` sauf mentions explicites :

```typescript
COLORS.primary[700]          // #1F3A27 — vert très foncé (calm gradient start)
COLORS.primary[500]          // #3C6E47 — vert principal (calm gradient end, chevron)
COLORS.semantic.dangerDark   // #DC2626 — rouge urgence (gradient end)
COLORS.surface.background    // #F7F5E6 — crème (LinearGradient fade)
COLORS.text.tertiary         // #6A8A6E — labels secondaires
SHADOWS.sm                   // ombre légère
```

Valeurs one-off (constantes locales dans HeroSection.tsx) :
```typescript
const WARNING_GRADIENT = ['#C2410C', '#F97316'] as const;
const URGENT_GRADIENT  = ['#7F1D1D', '#DC2626'] as const;
```

---

## Critères de succès

- [ ] Le hero change de couleur/message selon les données réelles (3 états)
- [ ] `urgentCount` et `expiringSoonCount` (≤3j) correctement calculés dans HomeScreen
- [ ] Les stats n'apparaissent plus en double (StatsCardsRow absent)
- [ ] Scroll horizontal des espaces fonctionne avec 1, 3 ou 10 espaces — hauteur fixe
- [ ] Les espaces urgents apparaissent en premier dans le scroll
- [ ] Empty state 0 espaces : bouton "Créer un espace"
- [ ] WeeklyChallengeCard : tout le texte lisible sur fond clair
- [ ] ProactiveRecipeCard : bordure ambre visible et cohérente
- [ ] `onFeedbackPress` supprimé sans erreur TypeScript
- [ ] TypeScript compile sans erreur (`npx tsc --noEmit`)
- [ ] Aucune régression sur les autres écrans
