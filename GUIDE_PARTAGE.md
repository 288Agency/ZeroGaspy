# 🎯 Guide : Où trouver les fonctions de partage

## 📱 Sur l'écran d'accueil (HomeScreen)

### Bouton "Rejoindre une liste"
```
┌─────────────────────────────┐
│  🚪 💬              ← ICI   │  En haut à DROITE
│                             │
│      🎯 Bonjour !           │
│      ZeroGaspy              │
│                             │
│  [Mes listes]               │
└─────────────────────────────┘
```

**Position :** En haut à droite, à côté de l'icône de feedback (💬)
**Icône :** 🚪 `enter-outline` (porte d'entrée)
**Action :** Ouvre le modal pour entrer un code d'invitation

---

## 📦 Sur l'écran d'une liste (InventoryListScreen)

### Bouton "Membres"
```
┌─────────────────────────────┐
│  ← Ma Liste        👥  ← ICI│  Dans le HEADER
│─────────────────────────────│
│                             │
│  🍎 Pommes                  │
│  🥛 Lait                    │
│  🥖 Pain                    │
│                             │
└─────────────────────────────┘
```

**Position :** Dans le header, en haut à DROITE
**Icône :** 👥 `people` (groupe de personnes)
**Action :** Ouvre l'écran de gestion des membres

---

## 🎯 Écran de gestion des membres

Une fois que tu cliques sur 👥, tu arrives ici :

```
┌─────────────────────────────┐
│  ← Membres                  │
│─────────────────────────────│
│                             │
│  Membres (1)                │
│  ┌───────────────────────┐  │
│  │ 👑 Toi (Propriétaire) │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ + Inviter un membre   │  │ ← Bouton PRINCIPAL
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

**Bouton "Inviter un membre"** : En bas de l'écran
**Action :** Ouvre le modal pour inviter quelqu'un

---

## 📝 Modal d'invitation

Quand tu cliques sur "Inviter un membre" :

```
┌─────────────────────────────┐
│  👥 Partager la liste    ✕  │
│  Ma Liste                   │
│                             │
│  Email de l'utilisateur     │
│  ┌─────────────────────────┐│
│  │ exemple@email.com      ││
│  └─────────────────────────┘│
│                             │
│  Permission                 │
│  [Voir] [Modifier] [Admin]  │
│                             │
│  ┌─────────────────────────┐│
│  │ ✉️ Envoyer l'invitation││ ← Clique ici
│  └─────────────────────────┘│
│                             │
│  ℹ️ L'utilisateur recevra   │
│     un code d'invitation    │
└─────────────────────────────┘
```

**Résultat :** Un code style "ABC123" sera généré
**Tu peux :** Le copier 📋 ou le partager 📤

---

## 🚪 Modal pour rejoindre

Quand tu cliques sur le bouton 🚪 en haut de HomeScreen :

```
┌─────────────────────────────┐
│  ✉️ Rejoindre une liste  ✕  │
│                             │
│  Entrez le code d'invitation│
│  que vous avez reçu         │
│                             │
│  Code d'invitation          │
│  ┌─────────────────────────┐│
│  │      ABC123            ││ ← Entre le code
│  └─────────────────────────┘│
│  6 caractères               │
│                             │
│  [Annuler]  [✓ Rejoindre]   │
│                             │
│  ℹ️ Vous pourrez voir et    │
│     modifier selon vos      │
│     permissions             │
└─────────────────────────────┘
```

---

## ⚠️ Si tu ne vois pas les boutons

### 1. Redémarre l'app complètement
```bash
# Dans le terminal
npx expo start --clear
```

### 2. Vérifie la console pour les erreurs
Regarde s'il y a des messages d'erreur en rouge

### 3. Vérifie que tu es bien connecté
Les fonctions de partage nécessitent une connexion Supabase

### 4. Vérifie dans le code
- **HomeScreen.tsx** ligne ~242 : `headerButtons`
- **InventoryListScreen.tsx** ligne ~576 : `headerRight`

---

## 🔍 Debug rapide

Ouvre la console et cherche :
```
✅ "AcceptInvitationModal" est importé
✅ "ShareListModal" est importé
✅ "ListMembersScreen" est dans la navigation
✅ Pas d'erreur "Cannot find module"
```

---

## 📞 Toujours pas visible ?

Partage-moi une capture d'écran de :
1. Ton écran d'accueil (HomeScreen)
2. Un écran de liste (InventoryListScreen)
3. Les messages de la console

Je pourrai t'aider plus précisément !
