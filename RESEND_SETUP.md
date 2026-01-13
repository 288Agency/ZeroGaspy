# Configuration Resend pour les feedbacks

Ce guide explique comment configurer l'envoi de feedbacks via Resend.

## 1. Créer un compte Resend

1. Allez sur [resend.com](https://resend.com)
2. Créez un compte gratuit
3. Obtenez votre clé API depuis le tableau de bord

## 2. Créer l'endpoint backend

Vous avez deux options :

### Option A : Vercel Serverless Function

Créez un fichier `api/feedback.ts` dans votre projet Vercel :

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message, images } = req.body;

    // Préparer les pièces jointes
    const attachments = (images || []).map((img: any) => ({
      filename: img.filename,
      content: Buffer.from(img.content, 'base64'),
      type: img.type,
    }));

    // Envoyer l'email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ZeroGaspy <onboarding@resend.dev>', // Remplacez par votre domaine vérifié
      to: 'votre-email@example.com', // Votre email de réception
      replyTo: email,
      subject: `Feedback - ZeroGaspy de ${name}`,
      html: `
        <h2>Nouveau feedback reçu</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${images && images.length > 0 ? `<p><strong>${images.length} image(s) jointe(s)</strong></p>` : ''}
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('Erreur Resend:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Feedback envoyé avec succès',
      data 
    });
  } catch (error: any) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du feedback' });
  }
}
```

### Option B : Express.js Server

Créez un serveur Express avec cette route :

```javascript
const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, message, images } = req.body;

    const attachments = (images || []).map((img) => ({
      filename: img.filename,
      content: Buffer.from(img.content, 'base64'),
      type: img.type,
    }));

    const { data, error } = await resend.emails.send({
      from: 'ZeroGaspy <onboarding@resend.dev>',
      to: 'votre-email@example.com',
      replyTo: email,
      subject: `Feedback - ZeroGaspy de ${name}`,
      html: `
        <h2>Nouveau feedback reçu</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        ${images && images.length > 0 ? `<p><strong>${images.length} image(s) jointe(s)</strong></p>` : ''}
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ success: true, message: 'Feedback envoyé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du feedback' });
  }
});

app.listen(3000, () => {
  console.log('Serveur en écoute sur le port 3000');
});
```

## 3. Configurer les variables d'environnement

### Dans votre backend (Vercel/Netlify/etc.) :

Ajoutez la variable d'environnement :
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Dans votre app React Native :

Créez un fichier `.env` à la racine du projet :

```
EXPO_PUBLIC_FEEDBACK_API_URL=https://votre-api.com/api/feedback
```

Puis modifiez `utils/feedbackService.ts` si nécessaire pour utiliser cette URL.

## 4. Vérifier votre domaine (optionnel mais recommandé)

1. Dans le tableau de bord Resend, allez dans "Domains"
2. Ajoutez votre domaine
3. Suivez les instructions pour vérifier votre domaine
4. Une fois vérifié, remplacez `onboarding@resend.dev` par `feedback@votredomaine.com`

## 5. Tester

1. Lancez votre app
2. Ouvrez le modal de feedback
3. Remplissez le formulaire et envoyez
4. Vérifiez que vous recevez l'email

## Notes importantes

- Le plan gratuit de Resend permet 100 emails/jour
- Les images sont converties en base64 et envoyées en pièces jointes
- Assurez-vous que votre endpoint backend accepte les requêtes POST avec un body JSON
- Pour la production, utilisez HTTPS pour votre API

