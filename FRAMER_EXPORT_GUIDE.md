# Guide d'export vers Framer

## Méthode 1 : Capture d'écran + Prototype interactif

### Étape 1 : Capturer les écrans
1. Lance ton app avec `npx expo start`
2. Prends des screenshots de chaque écran principal :
   - HomeScreen
   - InventoryScreen
   - ListsScreen
   - RecipesScreen
   - StatsScreen
   - PaywallModal (ouvert)
   - AddFoodScreen

### Étape 2 : Créer le projet Framer
1. Va sur [framer.com](https://framer.com)
2. Crée un nouveau projet "ZeroGaspy Prototype"
3. Importe tes screenshots comme images

### Étape 3 : Créer les interactions
- Utilise les **Frames** de Framer pour chaque écran
- Ajoute des **Links** entre les écrans pour simuler la navigation
- Configure les **Transitions** (slide, fade, etc.)

---

## Méthode 2 : Exporter les composants React vers Framer

### Option A : Utiliser React dans Framer
Framer supporte React directement ! Tu peux :

1. **Créer un composant React dans Framer**
   - File > New Component > Code Component
   - Copie ton code React Native
   - Adapte pour le web (remplace `View` par `div`, etc.)

2. **Utiliser les composants existants**
   - Importe tes composants depuis GitHub
   - Adapte pour le web avec `react-native-web`

### Option B : Utiliser Framer Motion (pour animations web)
Si tu veux créer une version web animée :

```bash
npm install framer-motion
```

Puis adapte tes animations Reanimated vers Framer Motion.

---

## Méthode 3 : Design System dans Framer

### Créer un Design System
1. Dans Framer, crée un **Component Set**
2. Définis tes couleurs, typographie, espacements
3. Crée des composants réutilisables :
   - Button
   - Card
   - Input
   - Modal
   - etc.

### Exporter depuis ton code
Utilise les valeurs de `utils/designSystem.ts` :
- Colors
- Typography
- Spacing
- Shadows

---

## Méthode 4 : Prototype interactif complet

### Structure recommandée dans Framer :

```
ZeroGaspy Prototype
├── Screens
│   ├── Home
│   ├── Inventory
│   ├── Lists
│   ├── Recipes
│   └── Stats
├── Modals
│   ├── Paywall
│   ├── AddFood
│   └── Settings
└── Components
    ├── Button
    ├── Card
    └── Input
```

### Interactions à créer :
- **Navigation** : Bottom tabs → Change de screen
- **Modals** : Bouton → Ouvre modal avec overlay
- **Animations** : Transitions entre écrans
- **Gestures** : Swipe, tap, long press

---

## Commandes utiles

### Générer des screenshots automatiquement
```bash
# Avec Expo
npx expo start
# Puis utilise un outil de screenshot automatique
```

### Exporter les assets
```bash
# Les assets sont dans assets/
# Exporte-les vers Framer
```

---

## Tips Framer

1. **Utilise les Variants** pour les états (hover, active, disabled)
2. **Animate** pour les transitions fluides
3. **Overrides** pour personnaliser les instances
4. **Code Components** pour la logique complexe
5. **Prototype Mode** pour tester les interactions

---

## Ressources

- [Framer Documentation](https://www.framer.com/docs/)
- [React in Framer](https://www.framer.com/docs/guides/code-components/)
- [Framer Motion](https://www.framer.com/motion/)
