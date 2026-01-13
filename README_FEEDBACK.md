# 📧 Système de Feedback avec Resend

Système de feedback professionnel intégré avec Resend pour envoyer des emails.

## ✨ Fonctionnalités

- ✅ Envoi d'emails via Resend
- ✅ Support des pièces jointes (images)
- ✅ Validation complète des données
- ✅ Protection contre les injections XSS
- ✅ Gestion d'erreurs robuste
- ✅ Email HTML stylisé
- ✅ Prêt pour la production

## 🚀 Déploiement rapide

### Option A : Serveur Express (Recommandé - Plus simple)

1. **Créer un compte Resend** : [resend.com](https://resend.com) → Obtenez votre clé API

2. **Déployer sur Railway** (gratuit) :
   - Allez sur [railway.app](https://railway.app)
   - "New Project" → "Deploy from GitHub repo"
   - Sélectionnez le dossier `server`
   - Ajoutez les variables d'environnement (voir `server/README.md`)

3. **Configurer l'app** :
   ```env
   EXPO_PUBLIC_FEEDBACK_API_URL=https://votre-projet.railway.app/api/feedback
   ```

**Voir `server/README.md` pour les détails complets.**

### Option B : Vercel Serverless

1. **Créer un compte Resend** : [resend.com](https://resend.com)

2. **Déployer sur Vercel** :
   ```bash
   npm i -g vercel
   vercel
   ```

3. **Configurer les variables** dans Vercel Dashboard

4. **Configurer l'app** :
   ```env
   EXPO_PUBLIC_FEEDBACK_API_URL=https://votre-projet.vercel.app/api/feedback
   ```

## 📁 Structure

```
server/
  └── index.js             # Serveur Express (Option A - Recommandé)
api/
  └── feedback.ts          # Endpoint Vercel (Option B)
utils/
  └── feedbackService.ts   # Service client React Native
components/
  └── FeedbackModal.tsx    # Interface utilisateur
```

## 🔒 Sécurité

- Validation des données côté serveur
- Protection XSS (escape HTML)
- Limite : 5 images max, 10MB par image
- Limite : 5000 caractères pour le message
- CORS configuré

## 📝 Utilisation

L'endpoint est déjà intégré dans `FeedbackModal`. Il suffit de :

1. Déployer l'endpoint sur Vercel
2. Configurer les variables d'environnement
3. Configurer l'URL dans `.env`
4. Tester !

## 🎨 Email HTML

Les emails sont envoyés avec un design professionnel incluant :
- Header avec le nom de l'app
- Informations structurées
- Message formaté
- Footer informatif

## 📚 Documentation complète

Voir `DEPLOY.md` pour le guide de déploiement détaillé.

