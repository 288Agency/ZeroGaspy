# 🔒 Configuration OCR Sécurisé - Guide de Déploiement

## Vue d'ensemble

Les clés API Mindee et Google Vision ont été déplacées côté serveur pour la sécurité.
Une Edge Function Supabase `ocr-scan` gère maintenant tous les appels OCR.

---

## ✅ Ce qui a été fait

### 1. Edge Function créée
- **Fichier:** `supabase/functions/ocr-scan/index.ts`
- **Fonctionnalités:**
  - Reçoit l'image en base64 depuis le client
  - Appelle Mindee (priorité) ou Google Vision (fallback) côté serveur
  - Retourne les résultats parsés
  - Les clés API ne sont **jamais exposées** au client

### 2. Code client modifié
- **Nouveau service:** `services/ocrService.ts`
- **Composant mis à jour:** `components/ReceiptScannerModal.tsx`
- Utilise maintenant `scanReceiptSecure()` qui appelle l'Edge Function

### 3. Clés API retirées du client
Supprimé de :
- ✅ `eas.json` (preview + production)
- ✅ `.env`
- ✅ `app.config.ts`
- ✅ `config/env.ts`

---

## 📦 Étapes de déploiement

### Étape 1 : Déployer l'Edge Function

```bash
# Déployer la fonction sur Supabase
npx supabase functions deploy ocr-scan
```

### Étape 2 : Configurer les secrets Supabase

Les clés API doivent être stockées comme **secrets Supabase** (côté serveur uniquement).

#### Option A : Via le Dashboard Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard/project/jiyhldfgztzknkccuidq
2. Settings → Edge Functions → Secrets
3. Ajoutez ces 2 secrets :

| Nom | Valeur |
|-----|--------|
| `MINDEE_API_KEY` | `md_rdP169103zimh7qqrggfzKX-BinsRJr-o_67wFgf_zIc` |
| `GOOGLE_VISION_API_KEY` | `AIzaSyA2AzEaQZQdKOPirq8BMqrthRPnwZZlEWU` |

#### Option B : Via CLI Supabase

```bash
# Configurer Mindee
npx supabase secrets set MINDEE_API_KEY=md_rdP169103zimh7qqrggfzKX-BinsRJr-o_67wFgf_zIc

# Configurer Google Vision (fallback)
npx supabase secrets set GOOGLE_VISION_API_KEY=AIzaSyA2AzEaQZQdKOPirq8BMqrthRPnwZZlEWU
```

> **Note:** Les secrets Supabase ne sont accessibles que par les Edge Functions, jamais par le client.

### Étape 3 : Tester l'Edge Function

```bash
# Test local (si vous avez Supabase CLI configuré localement)
npx supabase functions serve ocr-scan

# Ou testez directement via l'app après le déploiement
```

### Étape 4 : Builder et déployer l'app

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

---

## 🧪 Test de l'Edge Function

### Test manuel via curl

```bash
curl -X POST \
  'https://jiyhldfgztzknkccuidq.supabase.co/functions/v1/ocr-scan' \
  -H 'Authorization: Bearer VOTRE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "imageBase64": "BASE64_IMAGE_HERE",
    "preferredProvider": "mindee"
  }'
```

### Test depuis l'app

1. Ouvrez l'app
2. Allez dans "Scan de ticket"
3. Prenez une photo d'un ticket de caisse
4. Vérifiez les logs : `🔒 Scan OCR sécurisé via Edge Function...`

---

## 🔍 Vérification

### Vérifier que les clés ne sont plus exposées :

```bash
# Chercher les clés dans le code client
grep -r "MINDEE_API_KEY" --include="*.ts" --include="*.tsx" --include="*.json" .

# Devrait seulement trouver :
# - supabase/functions/ocr-scan/index.ts (serveur) ✅
# - docs/OCR_SECURITY_SETUP.md (documentation) ✅
# PAS dans : eas.json, app.config.ts, .env ✅
```

### Vérifier que l'Edge Function est déployée :

```bash
npx supabase functions list
```

Devrait afficher `ocr-scan` dans la liste.

---

## 📊 Avantages de cette approche

| Avant (clés côté client) | Après (Edge Function) |
|--------------------------|----------------------|
| ❌ Clés exposées dans le bundle | ✅ Clés côté serveur uniquement |
| ❌ Risque de vol de clés | ✅ Impossible d'extraire les clés |
| ❌ Abus de quota possible | ✅ Contrôle total des appels |
| ❌ Rebuild requis pour changer les clés | ✅ Changement de clés sans rebuild |

---

## 🐛 Troubleshooting

### Erreur : "No OCR provider configured"

**Cause :** Les secrets Supabase ne sont pas configurés.
**Solution :** Suivre l'Étape 2 ci-dessus pour configurer les secrets.

### Erreur : "Function not found"

**Cause :** L'Edge Function n'est pas déployée.
**Solution :** Lancer `npx supabase functions deploy ocr-scan`

### Erreur : "Mindee failed and Google Vision not configured"

**Cause :** Seul Mindee est configuré et l'appel a échoué.
**Solution :** Configurer aussi `GOOGLE_VISION_API_KEY` comme fallback.

### L'app ne peut pas appeler l'Edge Function

**Cause :** Problème d'authentification Supabase.
**Solution :** Vérifier que `EXPO_PUBLIC_SUPABASE_ANON_KEY` est bien configuré dans `eas.json`.

---

## 📝 Notes

- Les secrets Supabase sont **chiffrés** et stockés de manière sécurisée
- Seules les Edge Functions peuvent accéder aux secrets
- Les secrets ne sont **jamais** envoyés au client
- Pour changer une clé API, il suffit de mettre à jour le secret Supabase (pas de rebuild nécessaire)

---

## 🔄 Rollback (si besoin)

Si vous devez revenir à l'ancienne méthode :

1. Restaurer les clés dans `eas.json`, `app.config.ts`, `config/env.ts`
2. Modifier `components/ReceiptScannerModal.tsx` pour utiliser les anciennes fonctions
3. Rebuilder l'app

Mais ce n'est **pas recommandé** pour des raisons de sécurité.
