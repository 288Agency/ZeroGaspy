# Guide de deploiement - Feedback avec Supabase Edge Functions + Resend

## Configuration

### 1. Configurer Resend

1. Creez un compte sur [resend.com](https://resend.com)
2. Obtenez votre cle API depuis le tableau de bord
3. Notez votre cle API : `re_xxxxxxxxxxxxx`

### 2. Configurer les secrets Supabase

Dans le tableau de bord Supabase de votre projet :

1. Allez dans **Project Settings** > **Edge Functions**
2. Ajoutez ces secrets :

   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxx
   FEEDBACK_RECIPIENT_EMAIL = votre-email@example.com
   RESEND_FROM_EMAIL = ZeroGaspy <onboarding@resend.dev>
   ```

Ou via CLI :

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set FEEDBACK_RECIPIENT_EMAIL=votre-email@example.com
supabase secrets set RESEND_FROM_EMAIL="ZeroGaspy <onboarding@resend.dev>"
```

### 3. Deployer la Edge Function

```bash
supabase functions deploy feedback
```

### 4. Configurer l'app React Native

Assurez-vous que votre fichier `.env` contient :

```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
```

## Securite

- Validation des donnees cote serveur
- Protection contre les injections XSS (escape HTML)
- Limitation de la taille des images (~10MB par image)
- Limitation du nombre d'images (max 5)
- Limitation de la longueur du message (max 5000 caracteres)
- CORS configure pour l'app mobile

## Configuration avancee

### Utiliser votre propre domaine

1. Dans Resend, ajoutez votre domaine
2. Verifiez-le en ajoutant les enregistrements DNS
3. Mettez a jour le secret `RESEND_FROM_EMAIL` :
   ```bash
   supabase secrets set RESEND_FROM_EMAIL="ZeroGaspy <feedback@votredomaine.com>"
   ```

## Depannage

### L'email n'est pas envoye

1. Verifiez les logs Supabase : Dashboard > Edge Functions > feedback > Logs
2. Verifiez que `RESEND_API_KEY` est bien configure
3. Verifiez que votre domaine est verifie dans Resend (si vous utilisez un domaine custom)

### Erreur CORS

L'endpoint gere automatiquement CORS. Si vous avez des problemes :
- Verifiez que l'URL Supabase dans `.env` est correcte
- Verifiez que vous utilisez la bonne anon key

## Structure des fichiers

```
ZeroGaspyLocal/
├── supabase/
│   └── functions/
│       └── feedback/
│           └── index.ts      # Edge Function Supabase
├── utils/
│   └── feedbackService.ts    # Service client pour envoyer les feedbacks
├── components/
│   └── FeedbackModal.tsx     # Modal de feedback
└── DEPLOY.md                 # Ce fichier
```
