# Guide de déploiement - Feedback avec Resend

## 🎯 Deux options de déploiement

### Option A : Serveur Express (Recommandé - Plus simple)
Voir `server/README.md` pour déployer sur Railway, Render, ou votre serveur.

### Option B : Vercel Serverless Function
Voir ci-dessous pour déployer sur Vercel.

---

## 🚀 Déploiement rapide sur Vercel

### 1. Préparer votre projet

1. Assurez-vous d'avoir un compte [Vercel](https://vercel.com)
2. Installez Vercel CLI :
   ```bash
   npm i -g vercel
   ```

### 2. Configurer Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Obtenez votre clé API depuis le tableau de bord
3. Notez votre clé API : `re_xxxxxxxxxxxxx`

### 3. Déployer l'endpoint

1. Dans le terminal, à la racine du projet :
   ```bash
   vercel
   ```

2. Suivez les instructions :
   - Connectez-vous à Vercel
   - Créez un nouveau projet ou liez un projet existant
   - Vercel détectera automatiquement le fichier `api/feedback.ts`

### 4. Configurer les variables d'environnement

Dans le dashboard Vercel de votre projet :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez ces variables :

   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxx
   FEEDBACK_RECIPIENT_EMAIL = votre-email@example.com
   RESEND_FROM_EMAIL = ZeroGaspy <onboarding@resend.dev>
   ```

3. **Important** : Cochez toutes les environnements (Production, Preview, Development)

### 5. Configurer l'app React Native

1. Créez un fichier `.env` à la racine du projet :
   ```env
   EXPO_PUBLIC_FEEDBACK_API_URL=https://votre-projet.vercel.app/api/feedback
   ```

2. Remplacez `votre-projet.vercel.app` par l'URL réelle de votre déploiement Vercel

3. Redémarrez Expo :
   ```bash
   npm start
   ```

### 6. Tester

1. Ouvrez l'app
2. Ouvrez le modal de feedback
3. Remplissez le formulaire et envoyez
4. Vérifiez que vous recevez l'email

## 🔒 Sécurité

- ✅ Validation des données côté serveur
- ✅ Protection contre les injections XSS (escape HTML)
- ✅ Limitation de la taille des images
- ✅ Limitation du nombre d'images (max 5)
- ✅ Limitation de la longueur du message (max 5000 caractères)
- ✅ CORS configuré pour l'app mobile

## 📧 Configuration avancée

### Utiliser votre propre domaine

1. Dans Resend, ajoutez votre domaine
2. Vérifiez-le en ajoutant les enregistrements DNS
3. Mettez à jour `RESEND_FROM_EMAIL` :
   ```
   RESEND_FROM_EMAIL = ZeroGaspy <feedback@votredomaine.com>
   ```

### Personnaliser l'email de réception

Changez simplement la variable `FEEDBACK_RECIPIENT_EMAIL` dans Vercel.

## 🐛 Dépannage

### L'email n'est pas envoyé

1. Vérifiez les logs Vercel : Dashboard → Deployments → Votre déploiement → Functions
2. Vérifiez que `RESEND_API_KEY` est bien configurée
3. Vérifiez que votre domaine est vérifié dans Resend (si vous utilisez un domaine custom)

### Erreur CORS

L'endpoint gère automatiquement CORS. Si vous avez des problèmes :
- Vérifiez que l'URL dans `.env` est correcte
- Vérifiez que vous utilisez HTTPS

### Images trop volumineuses

L'endpoint limite à ~10MB par image. Si nécessaire, compressez les images côté client avant l'envoi.

## 📝 Structure des fichiers

```
ZeroGaspyLocal/
├── api/
│   ├── feedback.ts          # Endpoint Vercel serverless function
│   └── vercel.json          # Configuration Vercel
├── utils/
│   └── feedbackService.ts   # Service client pour envoyer les feedbacks
├── components/
│   └── FeedbackModal.tsx    # Modal de feedback
├── .env.example             # Exemple de configuration
└── DEPLOY.md               # Ce fichier
```

## 🎉 C'est prêt !

Votre système de feedback est maintenant opérationnel avec Resend !

