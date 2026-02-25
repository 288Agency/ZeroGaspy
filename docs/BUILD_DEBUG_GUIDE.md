# Guide de Débogage - Builds EAS

## 🎯 Problème

L'authentification fonctionne en développement (`expo start`) mais échoue avec "No api Key found in request" dans les builds de production (App Store/Google Play).

## 🔍 Cause

Le fichier `.env` **n'est PAS inclus** dans les builds EAS. Les variables d'environnement doivent venir de :
1. `eas.json` (section `build.production.env`)
2. Ou des secrets EAS (`eas secret:push`)

## ✅ Solution Implémentée

### 1. **Système de configuration centralisé** (`config/env.ts`)

Nouveau fichier qui charge les variables avec fallback :
- D'abord depuis `Constants.expoConfig.extra`
- Ensuite depuis `process.env` (dev uniquement)
- Affiche des erreurs claires si des variables manquent

### 2. **Diagnostics au build** (`app.config.ts`)

Logs ajoutés pour vérifier que les variables sont injectées pendant le build :
```
🔍 [Build] EXPO_PUBLIC_SUPABASE_URL: SET
🔍 [Build] EXPO_PUBLIC_SUPABASE_ANON_KEY: SET
```

### 3. **Script de test** (`scripts/test-env.ts`)

Vérifie que toutes les variables sont configurées avant de builder.

## 🧪 Comment Tester

### Étape 1 : Tester la config localement

```bash
npm run test:env
```

Doit afficher : ✅ Toutes les variables sont configurées correctement !

### Étape 2 : Vérifier eas.json

Ouvrez `eas.json` et vérifiez que `build.production.env` contient :

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://jiyhldfgztzknkccuidq.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOi...",
        "EXPO_PUBLIC_GOOGLE_VISION_API_KEY": "AIza...",
        "EXPO_PUBLIC_MINDEE_API_KEY": "md_...",
        "EXPO_PUBLIC_FEEDBACK_EMAIL": "contact@288agency.com"
      }
    }
  }
}
```

### Étape 3 : Builder avec logs

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

**Regardez les logs de build** pour voir si les variables sont injectées :
- Cherchez : `🔍 [Build] EXPO_PUBLIC_SUPABASE_URL: SET`
- Si vous voyez `MISSING`, les variables ne sont pas injectées

### Étape 4 : Tester le build

Une fois le build terminé :

1. **Téléchargez le build** sur votre appareil
2. **Lancez l'app**
3. **Vérifiez les logs** avec :
   - iOS : Xcode > Window > Devices and Simulators > View Device Logs
   - Android : `adb logcat | grep ZeroGaspy`

Cherchez :
```
=== DIAGNOSTICS CONFIGURATION ===
✅ Configuration Supabase OK
```

Ou :
```
❌ [ENV] Variables Supabase manquantes !
```

## 🔧 Solutions aux Problèmes Courants

### ❌ "Variables manquantes dans eas.json"

**Solution** : Vérifiez que toutes les variables dans `.env` sont aussi dans `eas.json` :

```bash
# Comparer
cat .env
cat eas.json | grep -A 10 "production"
```

Les noms doivent être identiques (ex: `EXPO_PUBLIC_SUPABASE_URL`)

### ❌ "Les logs de build ne montrent pas les variables"

**Solution** : Le `app.config.ts` n'est peut-être pas évalué correctement.

Vérifiez que `app.config.ts` utilise bien une fonction :
```typescript
export default ({ config }: ConfigContext): ExpoConfig => {
  console.log('Variables:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  return { ... };
};
```

### ❌ "API Key invalide" (Google Vision / Supabase)

**Problème possible** : Les clés API ont des **restrictions** (domaines, bundle IDs)

**Solution Google Vision** :
1. Allez dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Trouvez votre clé API
3. Vérifiez les restrictions :
   - **iOS** : Ajouter votre bundle ID (`com.zerogaspy.app`)
   - **Android** : Ajouter votre package name + SHA-1 fingerprint

**Solution Supabase** :
1. Allez dans [Supabase Dashboard](https://app.supabase.com)
2. Settings > API
3. Vérifiez que l'URL et la clé sont corrects
4. Project Settings > Auth > Site URL : Ajoutez `zerogaspy://`

### ❌ "Variables OK en dev mais pas en prod"

**Cause** : Les builds EAS utilisent un environnement différent

**Solution** : Utiliser les **secrets EAS** (plus sécurisé) :

```bash
# Définir les secrets
eas secret:push --scope project --env-file .env

# Lister les secrets
eas secret:list

# Mettre à jour eas.json pour utiliser les secrets
# (Supprimer les valeurs en clair de eas.json)
```

## 📦 Workflow de Build Recommandé

1. ✅ Tester localement : `expo start --clear`
2. ✅ Vérifier la config : `npm run test:env`
3. ✅ Committer les changements
4. ✅ Builder : `eas build --profile production --platform ios`
5. ✅ Vérifier les logs de build
6. ✅ Télécharger et tester le build
7. ✅ Si OK : `eas submit --profile production --platform ios`

## 🔐 Sécurité

**⚠️ IMPORTANT** : Ne commitez JAMAIS les vraies clés API dans Git !

Les clés dans `eas.json` sont visibles dans l'historique Git. Pour plus de sécurité :

1. Utilisez les secrets EAS au lieu de `eas.json`
2. Ajoutez `.env` dans `.gitignore` (déjà fait)
3. Utilisez `env.example` comme template sans vraies valeurs

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. Vérifiez les logs de build EAS
2. Vérifiez les logs de l'app sur l'appareil
3. Contactez : quentin@288.agency

---

**Dernière mise à jour** : 2026-02-25
