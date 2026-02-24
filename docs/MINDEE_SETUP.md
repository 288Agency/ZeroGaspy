# Configuration Mindee Receipt OCR

ZeroGaspy utilise **Mindee Receipt OCR** pour scanner les tickets de caisse avec une précision professionnelle (95%+).

## 🚀 Obtenir votre clé API Mindee (GRATUIT)

### 1. Créer un compte

1. Allez sur **https://platform.mindee.com/signup**
2. Créez un compte gratuit avec votre email
3. Confirmez votre email

### 2. Récupérer votre clé API

1. Une fois connecté, allez dans **"API Keys"** dans le menu de gauche
2. Vous verrez votre **API Key** déjà générée
3. Cliquez sur le bouton **"Copy"** pour copier la clé

### 3. Configurer dans ZeroGaspy

#### En développement :

Éditez le fichier `.env` à la racine du projet :

```bash
EXPO_PUBLIC_MINDEE_API_KEY=votre_clé_api_ici
```

#### En production (EAS Build) :

Éditez le fichier `eas.json` :

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_MINDEE_API_KEY": "votre_clé_api_ici"
      }
    }
  }
}
```

### 4. Redémarrer l'app

```bash
# Arrêtez Expo (Ctrl+C)
npx expo start --clear
```

## 📊 Plan gratuit

- ✅ **250 scans gratuits par mois**
- ✅ Aucune carte bancaire requise
- ✅ API complète (extraction produits, prix, totaux, etc.)
- ✅ Support multi-langues (FR, EN, etc.)

## 💰 Tarification

Si vous dépassez 250 scans/mois :

| Plan | Scans/mois | Prix |
|------|------------|------|
| **Free** | 250 | Gratuit |
| **Starter** | 2 000 | 49€/mois |
| **Growth** | 20 000 | 299€/mois |
| **Pay-as-you-go** | À l'unité | 0.025€/scan |

## 🔍 Fonctionnalités

Mindee extrait automatiquement :

- ✅ Liste des produits avec noms précis
- ✅ Quantités
- ✅ Prix unitaires et totaux
- ✅ Nom du magasin
- ✅ Date et heure d'achat
- ✅ Total TTC
- ✅ Catégorisation automatique des produits

## 📚 Documentation officielle

- Dashboard : https://platform.mindee.com
- API Docs : https://developers.mindee.com/docs/receipt-ocr
- Pricing : https://mindee.com/pricing

## ❓ Support

Si vous rencontrez des problèmes :

1. Vérifiez que votre clé API est bien configurée dans `.env`
2. Redémarrez Expo avec `--clear`
3. Consultez les logs dans la console Expo
4. Contact Mindee : support@mindee.com

## 🔒 Sécurité

- ✅ RGPD compliant (serveurs EU)
- ✅ Les images sont supprimées après traitement
- ✅ Clé API à garder confidentielle (ne jamais commiter dans Git)
- ✅ Utiliser les variables d'environnement pour la stocker
