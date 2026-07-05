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

---

# Deploiement iOS (App Store / EAS)

Guide de mise en prod iOS via EAS Build + Submit. **A lire avant chaque release** :
les pieges ci-dessous ont deja fait echouer plusieurs builds (56-58).

## Pre-requis (une fois)

```bash
# Depuis ton VRAI terminal (login interactif, TTY requis) :
npx eas-cli login
```

Le login via `!` dans un assistant ou en CI ne marche pas (non-TTY). Utiliser un
`EXPO_TOKEN` sinon.

## Versioning (IMPORTANT)

- `eas.json` -> `cli.appVersionSource: "local"` : le numero de build vient de
  `app.config.ts` (**pas** d'`autoIncrement` iOS), pour qu'il soit deterministe.
  C'est requis pour que le **widget** herite du meme numero (voir plus bas).
- Avant chaque release, bumper dans `app.config.ts` :
  - `version` (version marketing, ex `2.2.0`)
  - `ios.buildNumber` **et** `android.versionCode`
- **Le `buildNumber` doit etre strictement > au dernier build deja sur EAS/ASC.**
  Verifier avant :
  ```bash
  npx eas-cli build:list --platform ios --limit 5
  ```
  (Ex. en juillet 2026 le dernier etait 58 -> on a mis 59.)

## Widget iOS — les 3 pieges qui font echouer le build

Le widget (`targets/widget/`, plugin `plugins/withIOSWidget.js`) est une **app
extension** : son bundle id `com.zerogaspy.app.widget` a ses propres contraintes.

1. **Versions identiques a l'app** (sinon rejet Apple « CFBundle(Short)Version
   mismatch »). Gere automatiquement : le plugin lit `config.version` +
   `config.ios.buildNumber` et une passe de re-sync s'applique a chaque prebuild.
   L'`Info.plist` du widget utilise `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`.
2. **Meme equipe Apple que l'app** : `DEVELOPMENT_TEAM` = **`CU86TBMX5S`**
   (Quentin Manfredi – Individual), l'equipe qui possede reellement l'app et ses
   credentials. (Pas `M32LP7D76G`.) Present dans `app.config.ts`, `eas.json` et le
   plugin.
3. **Declarer l'extension a EAS** (sinon « No profiles for …widget ») via
   `app.config.ts` -> `extra.eas.build.experimental.ios.appExtensions` (targetName
   `ZeroGaspyWidget`, bundle id, App Group). Sans ca EAS ne provisionne que l'app
   principale et le build echoue au signing.

## Build + Submit

```bash
# 1) Build de production (la 1ere fois avec un nouveau profil de credentials,
#    lancer en INTERACTIF depuis ton vrai terminal pour le login Apple qui
#    genere le provisioning du widget) :
npx eas-cli build --platform ios --profile production

# 2) Envoyer a App Store Connect (cle API ASC deja stockee sur EAS -> non-interactif OK) :
npx eas-cli submit --platform ios --profile production --latest
```

Une fois `submit` OK, le build apparait dans **App Store Connect > TestFlight**
apres ~5-10 min de traitement Apple. Cote ASC il reste a : rattacher le build a
la version, remplir « Nouveautes », soumettre pour review.

## Verifier le fix widget SANS lancer un build EAS (rapide)

```bash
npx expo prebuild -p ios --no-install
grep -E "MARKETING_VERSION|CURRENT_PROJECT_VERSION|DEVELOPMENT_TEAM" \
  ios/*.xcodeproj/project.pbxproj | sort | uniq -c
```
Le widget doit afficher la meme `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`
que l'app, et `DEVELOPMENT_TEAM = CU86TBMX5S`.
