# 🚀 Serveur Feedback ZeroGaspy

Serveur Express simple pour envoyer les feedbacks via Resend.

## 📦 Installation

```bash
cd server
npm install
```

## ⚙️ Configuration

1. Copiez `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Modifiez `.env` avec vos informations :
   - `RESEND_API_KEY` : Votre clé API Resend
   - `FEEDBACK_RECIPIENT_EMAIL` : Votre email de réception
   - `RESEND_FROM_EMAIL` : Email d'envoi (domaine vérifié dans Resend)

## 🏃 Lancer en local

```bash
npm start
```

Ou en mode développement avec auto-reload :
```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

## 🌐 Déploiement

### Option 1 : Railway (Recommandé - Gratuit)

1. Allez sur [railway.app](https://railway.app)
2. Créez un compte
3. "New Project" → "Deploy from GitHub repo"
4. Sélectionnez votre repo
5. Railway détectera automatiquement le dossier `server`
6. Ajoutez les variables d'environnement dans Settings → Variables

**URL de votre API** : `https://votre-projet.railway.app`

### Option 2 : Render (Gratuit)

1. Allez sur [render.com](https://render.com)
2. Créez un compte
3. "New" → "Web Service"
4. Connectez votre repo GitHub
5. Configuration :
   - **Root Directory** : `server`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
6. Ajoutez les variables d'environnement dans Environment

**URL de votre API** : `https://votre-projet.onrender.com`

### Option 3 : Votre propre serveur

1. Installez Node.js (v18+)
2. Clonez le projet
3. Dans le dossier `server` :
   ```bash
   npm install
   npm start
   ```
4. Utilisez PM2 pour la production :
   ```bash
   npm install -g pm2
   pm2 start index.js --name zerogaspy-feedback
   ```

## 🔗 Configurer l'app React Native

Dans votre fichier `.env` à la racine du projet :

```env
EXPO_PUBLIC_FEEDBACK_API_URL=https://votre-projet.railway.app/api/feedback
```

Remplacez par l'URL réelle de votre déploiement.

## ✅ Test

Testez l'endpoint :
```bash
curl -X POST https://votre-api.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "message": "Message de test"
  }'
```

## 📝 Routes

- `GET /` : Vérification de santé
- `POST /api/feedback` : Envoyer un feedback

## 🔒 Sécurité

- ✅ Validation des données
- ✅ Protection XSS
- ✅ CORS configuré
- ✅ Limites de taille et nombre d'images
- ✅ Gestion d'erreurs

