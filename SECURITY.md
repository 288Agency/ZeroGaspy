# 🔒 Sécurité ZeroGaspy

## Mesures de sécurité implémentées

### 1. Système de logging sécurisé (`utils/logger.ts`)
- **Logs désactivés en production** : Les `console.log` sont automatiquement désactivés en mode production
- **Sanitisation des messages** : Les données sensibles (emails, tokens, mots de passe) sont automatiquement masquées
- **Limitation de taille** : Les messages sont tronqués pour éviter la fuite de données volumineuses

### 2. Validation des entrées (`utils/security.ts`)
- **Sanitisation des chaînes** : Suppression des caractères de contrôle et limitation de longueur
- **Échappement HTML** : Protection contre les injections XSS
- **Validation spécifique** :
  - Noms d'aliments (1-100 caractères, lettres/chiffres requis)
  - Emails (format RFC standard)
  - Dates (format JJ/MM/AAAA, plage valide)
  - Quantités (1-9999)
  - Codes-barres (EAN-8, EAN-12, EAN-13, EAN-14)
  - Titres de listes (1-50 caractères)

### 3. Protection du stockage (`utils/localStorage.ts`)
- **Liste blanche des clés** : Seules les clés autorisées peuvent être lues/écrites
- **Validation avant stockage** : Les données sont validées avant sauvegarde

### 4. Sécurité des API (`services/openFoodFactsService.ts`)
- **Timeout des requêtes** : 10 secondes maximum pour éviter les blocages
- **Validation des codes-barres** : Avant envoi à l'API
- **Sanitisation des réponses** : Les données reçues sont nettoyées

### 5. Securite des feedbacks (`utils/feedbackService.ts`)
- **Supabase Edge Function** : Les feedbacks sont envoyes via une Edge Function securisee
- **Validation complete** : Nom, email, message sont valides cote client et serveur
- **Limite des pieces jointes** : Maximum 5 images

## Configuration

### Variables d'environnement
Creez un fichier `.env` a partir de `env.example` :

```bash
cp env.example .env
```

Contenu du fichier :
```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
```

Ne jamais commiter le fichier `.env` ! Il est dans le `.gitignore`.

## Vulnerabilites connues

Pour mettre a jour les dependances :
```bash
npm update
npm audit fix
```

## Bonnes pratiques

### Pour les développeurs

1. **Ne jamais logger de données sensibles**
   ```typescript
   // ❌ Mauvais
   console.log('User password:', password);
   
   // ✅ Bon
   logger.info('Utilisateur authentifié');
   ```

2. **Toujours valider les entrées utilisateur**
   ```typescript
   // ❌ Mauvais
   const name = userInput;
   
   // ✅ Bon
   const validation = validateFoodName(userInput);
   if (!validation.valid) {
     throw new Error(validation.error);
   }
   ```

3. **Utiliser les fonctions de sanitisation**
   ```typescript
   import { sanitizeString, escapeHtml } from './utils/security';
   
   const cleanInput = sanitizeString(userInput, 100);
   const safeHtml = escapeHtml(userInput);
   ```

### Pour les utilisateurs

- L'application stocke les donnees **localement** sur l'appareil
- Les donnees peuvent etre synchronisees avec Supabase (optionnel)
- OpenFoodFacts est utilise pour les codes-barres
- Les feedbacks sont envoyes via Supabase Edge Functions + Resend

## Signaler une vulnérabilité

Si vous découvrez une vulnérabilité de sécurité, veuillez la signaler à :
- Email : contact@288agency.com

Merci de ne pas divulguer publiquement les vulnérabilités avant qu'elles soient corrigées.
