# ZeroGaspy — Audit Produit, UX & Monétisation B2C
**Date :** 2026-04-11
**Statut :** Validé
**Périmètre :** B2C uniquement — abonnements individuels + famille

---

## 1. Contexte & Objectifs

ZeroGaspy est une app mobile React Native 0.81.5 + Expo SDK 54 (React 19, TypeScript 5.9) anti-gaspillage alimentaire. Elle permet de gérer l'inventaire de son frigo/placard, de suivre les dates d'expiration, de scanner des tickets de caisse, de consulter des recettes et de gamifier son comportement anti-gaspi.

**État actuel :** ~50 utilisateurs, rétention non mesurée précisément (PostHog à activer en priorité pour établir la baseline J7/J30).

**Objectifs sur 12 mois :**
- Atteindre 5 000–8 000 MAU (scénario réaliste, canal organique uniquement)
- Générer 1 000–3 000 € MRR via abonnements
- Poser les bases d'une startup scalable B2C

**Pré-requis avant toute décision :** activer les funnels PostHog pour mesurer rétention J7/J30 actuelle, taux de complétion onboarding, et causes réelles du churn. Sans baseline, toute projection est une hypothèse.

---

## 2. Diagnostic — Forces & Faiblesses

### Forces réelles (différenciateurs perçus par l'utilisateur)

| Feature | Statut concurrentiel |
|---|---|
| Gamification (XP, badges, streaks, défis hebdomadaires) | **Unique** parmi les concurrents directs |
| Scan de ticket de caisse (OCR Mindee) | Rare, forte valeur perçue, gain de temps réel |
| Recettes proactives basées sur les expirations | Bien positionné, exécution à améliorer |
| Multi-espaces colorés et iconifiés | UX appréciée, organisation claire |

### Faiblesses critiques

**1. Core loop passif — problème #1 de rétention**
Le cycle actuel `ajouter → voir expiration → consommer → recommencer` ne génère pas de raison externe de revenir. Les apps à rétention élevée ont un loop actif : l'app contacte l'utilisateur → l'utilisateur agit → récompense immédiate. ZeroGaspy manque du trigger quotidien externe. À mesurer : quel % d'ouvertures vient d'une notification vs. spontané ?

**2. La valeur n'est pas quantifiée en argent**
130 €/mois — c'est le gaspillage alimentaire moyen d'un foyer français (source ADEME). ZeroGaspy ne montre jamais combien l'utilisateur a économisé. Ce chiffre est le hook numéro 1, il est absent de toutes les surfaces de l'app.

**3. Proposition premium trop faible pour convertir**
"1 scan ticket de plus" et "partager une liste de plus" ne valent pas 3–4 €/mois dans la perception utilisateur. Les features premium sont techniques, pas émotionnelles ni quotidiennement utiles.

**4. Recettes statiques**
Base hardcodée, texte pur, sans photos ni personnalisation. Pas une raison suffisante d'ouvrir l'app.

**5. Gamification en silo**
XP et badges 100 % locaux. Pas de pression sociale, pas d'effet viral, pas de comparaison entre utilisateurs. La gamification retient les joueurs intrinsèquement motivés mais ne crée pas d'habitude chez les autres.

**6. Onboarding sans "aha moment" fort**
L'utilisateur finit l'onboarding sans avoir visualisé la valeur concrète de l'app. L'ancrage sur les économies potentielles doit précéder le premier aliment ajouté.

**7. Publicités contre-productives**
AdMob sur 50 utilisateurs = revenus négligeables. Les bannières dégradent l'UX et envoient un signal de "app cheap" au moment critique de la première impression. À supprimer.

**8. Rétention non instrumentée**
Avant de corriger quoi que ce soit, il faut savoir précisément où les utilisateurs abandonnent. PostHog est en place — les funnels critiques doivent être configurés cette semaine.

---

## 3. Benchmark Concurrentiel

### No Waste (concurrent direct #1)
- **3,5M+ téléchargements**, app française, très bien notée App Store
- Widget iOS natif, liste de courses intégrée, multi-utilisateurs
- **Absent :** gamification, scan ticket, recettes intelligentes
- Modèle freemium avec plan premium ~2,99 €/mois
- **Conclusion :** Ils ont l'audience, nous avons les meilleures features. À court terme, l'enjeu est l'acquisition et la rétention, pas la feature parity.

### Too Good To Go
- 80M+ users, 17 pays
- Marketplace de paniers anti-gaspi des commerçants — **pas concurrent, complémentaire**
- N'a pas résolu le gaspillage domestique — c'est le terrain exclusif de ZeroGaspy
- **Note :** TGTG n'expose pas d'API publique aux partenaires individuels à ce jour. Une intégration reste une idée à valider, pas une opportunité confirmée.

### Olio
- 6M users, partage alimentaire entre voisins
- **Leçon clé :** l'impact collectif visible est un moteur d'engagement puissant. "Notre communauté a sauvé 2 400 tonnes ce mois" crée appartenance et motivation extrinsèque.

### Grocy
- Open source, auto-hébergeable, segment power users uniquement
- Aucune menace directe mais confirme l'existence d'un segment prêt à payer pour une vraie gestion de stock

### Fridgely / Consume
- Apps vieillissantes, peu maintenues, UX datée
- Opportunité ASO : cibler les mots-clés de ces apps pour capter leurs utilisateurs frustrés

---

## 4. Jobs-to-be-Done — Ce que les utilisateurs veulent vraiment

| # | Job réel | Force motivationnelle | Activé dans ZeroGaspy |
|---|---|---|---|
| 1 | Ne plus perdre d'argent sur les courses | 🔴 Très fort | ❌ Pas quantifié |
| 2 | Savoir quoi cuisiner ce soir avec ce qu'on a | 🟠 Fort | ⚠️ Partiel |
| 3 | Coordonner le foyer (éviter les doublons) | 🟠 Fort | ⚠️ Limité |
| 4 | Se sentir responsable / écolo | 🟡 Moyen | ⚠️ Partiel |
| 5 | Prouver et partager son impact | 🟡 Moyen | ⚠️ Partiel |

**Le job #1 est le plus fort et le plus absent. C'est la priorité absolue produit.**

---

## 5. Repositionnement Stratégique

### Proposition de valeur actuelle (implicite)
> "Gère ton frigo et évite le gaspillage"

Trop générique. Personne ne se lève le matin en pensant à gérer son frigo.

### Nouvelle proposition de valeur
> **"Économise jusqu'à 50 €/mois sur tes courses."**

*(Pas de "garanti" — le chiffre est une estimation basée sur prix moyens ADEME, pas un engagement contractuel. À communiquer comme "jusqu'à" ou "en moyenne".)*

**Pourquoi ça marche :**
- Chiffre concret, ancré dans une réalité vérifiable (gaspillage moyen = 130 €/foyer/mois en France)
- L'argent déclenche le téléchargement là où l'écologie convainc rarement seul
- Crée un ROI qui justifie l'abonnement : si l'app te fait économiser 50 €, payer 4 €/mois est trivial
- Différenciateur fort vs No Waste qui ne quantifie pas les économies

**Tagline :** *"Finis les 130 € jetés chaque mois."*

---

## 6. Modèle de Monétisation B2C

### À faire immédiatement
- **Supprimer les bannières AdMob** — revenus nuls à ce stade, UX dégradée

### Tier Gratuit — Généreux et accrocheur
- Espaces illimités
- Scan code-barres illimité
- **2 scans ticket/mois** (hausse vs 1 actuel)
- Recettes de base
- **Calculateur d'économies visible sur la Home** — le hook de rétention
- Gamification complète (XP, badges, défis)
- 1 liste partagée
- Historique 3 mois

### Tier Premium Solo — 3,49 €/mois ou 29,99 €/an
*(Pricing à tester via A/B RevenueCat — envisager 1,99 € pour le premier mois comme ancrage)*
- Scans ticket illimités
- **Recettes IA** basées sur les aliments qui expirent (voir section 7 pour les contraintes)
- **Widget iOS/Android** (voir section 7 pour la complexité technique)
- Stats avancées avec benchmark communautaire
- **Rapport mensuel** partageable (impact écologique + économies)
- Historique illimité
- Export des données
- Zéro publicité

### Tier Premium Famille — 6,49 €/mois ou 49,99 €/an
- Tout Premium Solo
- Jusqu'à 6 membres
- Espaces partagés en temps réel
- Notifications partagées entre membres
- Vue consolidée du foyer
- Stats familiales agrégées

### Affiliation (à partir de 5 000 MAU)
Partenariats avec services de courses en ligne. Non prioritaire avant d'avoir une audience significative.

---

## 7. Les 5 Features Prioritaires

### F1 — Calculateur d'économies en temps réel
**Priorité : 🔴 Critique**

Chaque aliment consommé avant expiration = valeur estimée sauvée. Affiché en gros sur la Home.

**Implémentation :**
- Table de prix moyens par catégorie alimentaire (source : ADEME / INSEE — à constituer)
- Si ticket scanné avec prix détecté → utiliser le prix réel
- Affichage : "Ce mois-ci, tu as économisé **~38 €**" (le "~" est important pour l'honnêteté du chiffre)
- Accumulé sur l'année pour le rapport mensuel

**Risque :** les prix moyens peuvent ne pas correspondre à la réalité d'un utilisateur donné. Communiquer clairement que c'est une estimation.

### F2 — Notification intelligente "Ce soir, mange ça"
**Priorité : 🔴 Critique**

Tous les jours à 17h (configurable) : "Tu as du poulet et des courgettes qui expirent demain → [Voir la recette]".

**Implémentation :**
- Croiser les aliments expirant dans les 48h avec la base recettes
- Fallback : si pas de recette matchante → "Ces aliments expirent bientôt, pense à les utiliser"
- **Stratégie de permission notifications :** demander la permission iOS juste après le premier aliment ajouté (pic de motivation), pas à l'onboarding. Sur Android, opt-out par défaut — activer immédiatement.
- Gestion du cas "utilisateur qui refuse" : reminder discret in-app J+3

### F3 — Widget iOS/Android
**Priorité : 🟠 Haute — feature Premium killer**

Afficher les 3 aliments qui expirent bientôt depuis l'écran d'accueil.

**Complexité technique réelle :**
- **iOS :** WidgetKit nécessite iOS 14+, App Groups pour partager les données entre app et widget, configuration Xcode native. Non supporté nativement dans Expo Go. Nécessite un plugin EAS custom ou un module natif. Compter 2–3 semaines de dev pour un résultat propre.
- **Android :** App Widget API, partage de données via SharedPreferences. Plugin `react-native-android-widget` disponible mais peu maintenu. Alternative : module natif Kotlin simple.
- **Recommandation :** iOS en priorité (meilleur taux de conversion premium iOS), Android ensuite.

### F4 — Score d'économies dans l'onboarding
**Priorité : 🟠 Haute**

À la fin de l'onboarding : "Combien tu jettes par semaine en moyenne ?" (slider visuel) → "ZeroGaspy pourrait te faire économiser **~X €/an**. Commençons."

**Implémentation :**
- 3 options simples : "Peu" / "Régulièrement" / "Souvent" → map vers 20/60/120 € d'économies annuelles estimées
- Stocker la réponse pour personnaliser la Home
- Cet objectif personnalisé doit être rappelé dans le rapport mensuel

### F5 — Recettes IA contextuelles (Premium)
**Priorité : 🟡 Moyenne**

Recettes générées via OpenAI/Gemini basées sur les ingrédients disponibles qui expirent bientôt.

**Contraintes à anticiper :**
- Coût API : ~0,002 € par requête actuellement, mais à mettre en cache agressivement (TTL 24h par combinaison d'ingrédients similaires)
- À 8 000 MAU avec 20 % de premium utilisant la feature quotidiennement : ~32 requêtes/jour = négligeable
- Mais à 50 000 MAU : revoir le modèle de cache ou imposer une limite (ex. 3 recettes IA/jour)
- **Fallback :** si pas de connexion ou quota dépassé → recettes statiques de la base existante

---

## 8. Stratégie d'Acquisition

### Court terme (0-6 mois) — Organique uniquement

**ASO (App Store Optimization)**
- Outil recommandé : AppFollow ou AppTweak (plans gratuits disponibles)
- Mots-clés prioritaires : "anti-gaspillage", "gestion frigo", "date péremption", "économiser courses", "no waste"
- Screenshots à refaire : centrer sur le chiffre d'économies, pas sur les features techniques
- Localisation : FR prioritaire, envisager BE/CH/CA dans un second temps
- Cadence : réviser les métadonnées chaque mois sur la base des données ASO

**Motion Design avec Remotion (pas de visage, 100% codé)**
- Outil : [Remotion](https://www.remotion.dev/) — vidéos React exportées en MP4
- Avantage clé : animations directement cohérentes avec le design system ZeroGaspy (`COLORS`, `TYPOGRAPHY` importés depuis `utils/designSystem.ts`)
- Chaque vidéo = composant React réutilisable. Changer un chiffre ou une couleur = modifier une prop
- Rendu local gratuit (`npx remotion render`), aucune dépendance externe

**Pack de 5 vidéos à produire en priorité :**

| # | Concept | Durée | Usage |
|---|---|---|---|
| V1 | Scan ticket → aliments qui apparaissent → économies affichées | 15s | TikTok / Reels |
| V2 | Compteur animé 0 → 47€ économisés ce mois | 8s | TikTok / Story |
| V3 | Notification 17h → recette générée → badge débloqué | 20s | TikTok |
| V4 | Mockup téléphone avec widget iOS en action | 10s | App Store / Reels |
| V5 | Impact collectif : X kg sauvés par la communauté | 12s | Story / LinkedIn |

- Cadence cible : 1 vidéo/semaine une fois les templates créés (changer les chiffres = 5 min)
- KPI : watch rate > 50 %, clics profil > 2 %, installs trackés via lien UTM PostHog
- Complément : UGC (3 mois Premium offerts à des utilisateurs motivés en échange d'une vidéo) + micro-influenceurs zéro déchet à la performance

**Referral**
- Trigger : "Invite 3 amis qui s'inscrivent → 1 mois Premium offert"
- Définition de "inscrit" : compte créé + 1 aliment ajouté dans les 7 jours (pas juste email)
- Implémentation : deep link unique par utilisateur, attribution via branche ou RevenueCat

**Réactivation des 50 utilisateurs existants**
Action prioritaire avant toute acquisition : interviewer 5–10 utilisateurs actuels (appel 20 min ou formulaire court). Comprendre pourquoi ils ont installé, pourquoi ils ne sont pas revenus. Ces insights valent plus que n'importe quelle projection.

### Moyen terme (6-12 mois)

- Micro-influenceurs cuisine / zéro déchet (10k–100k abonnés) — partenariat performance
- Impact collectif communautaire affiché dans l'app (leçon Olio)
- Rapport mensuel PDF partageable avec lien d'installation intégré et deep link vers App Store

---

## 9. Métriques à Suivre (PostHog)

**Baseline à mesurer immédiatement (semaine 1) :**
- Rétention J7 et J30 actuelles
- Taux de complétion onboarding
- Screens les plus et les moins visités
- Source des ouvertures (notification vs. direct)

**Cibles à 12 mois (après baseline établie) :**

| Métrique | Cible 3 mois | Cible 12 mois |
|---|---|---|
| MAU | 300–500 | 5 000–8 000 |
| Rétention J7 | Baseline + 10 pts | > 35 % |
| Rétention J30 | Baseline + 5 pts | > 20 % |
| Taux conversion premium | 1 % | 3–5 % |
| MRR | 50–150 € | 1 000–3 000 € |
| CTR notif "Ce soir, mange ça" | — | > 15 % |

*Les cibles à 3 mois sont relatives à la baseline mesurée, pas des chiffres absolus.*

---

## 10. Roadmap Priorisée

### Phase 0 — Instrumentation (semaine 1, avant tout)
- [ ] Configurer funnels PostHog : onboarding, ajout aliment, conversion premium
- [ ] Interviewer 5–10 utilisateurs existants
- [ ] Établir baseline rétention J7/J30

### Phase 1 — Réparer la rétention (0-3 mois)
- [ ] Supprimer les bannières AdMob
- [ ] Implémenter le calculateur d'économies (Home redesignée)
- [ ] Notification quotidienne "Ce soir, mange ça" + stratégie opt-in
- [ ] Revoir l'onboarding avec ancrage économies (F4)
- [ ] Passer les scans ticket gratuits à 2/mois
- [ ] Refaire les screenshots App Store (centrer sur le €)
- [ ] Lancer les funnels ASO

### Phase 2 — Monétiser (3-6 mois)
- [ ] Widget iOS (en priorité) puis Android
- [ ] Plan Famille
- [ ] Recettes IA avec gestion du cache
- [ ] Rapport mensuel PDF partageable
- [ ] Referral : 1 mois Premium pour 3 invités actifs
- [ ] Premiers contenus TikTok/Reels
- [ ] A/B test de prix via RevenueCat

### Phase 3 — Scaler (6-12 mois)
- [ ] Leaderboard social optionnel
- [ ] Impact collectif communauté affiché
- [ ] Micro-influenceurs
- [ ] Affiliation courses en ligne (si > 5 000 MAU)

---

## 11. Projection Financière B2C

| Scénario | MAU 12 mois | Conv. % | Abonnés | MRR estimé |
|---|---|---|---|---|
| Pessimiste (organique seul, lent) | 2 000 | 2 % | 40 | 160 € |
| Réaliste (organique + TikTok) | 5 000 | 3,5 % | 175 | 700 € |
| Optimiste (viral ou paid) | 8 000 | 5 % | 400 | 1 600 € |

*ARPU moyen estimé : 4 € (mix Solo + Famille). Ces projections supposent que la Phase 1 améliore significativement la rétention. Sans rétention fixée, l'acquisition ne produit pas de MRR durable.*

**Pour atteindre l'objectif 1 000–3 000 € MRR :** le scénario réaliste nécessite un canal d'acquisition actif (TikTok + ASO + referral) ET une rétention J30 > 20 %. Si la rétention reste faible après la Phase 1, envisager une campagne paid Meta/TikTok Ads ciblée à partir du mois 6 avec un budget initial de 500–1 000 €/mois.

---

*Spec rédigée le 2026-04-11. À réviser après les mesures de la Phase 0 et les résultats de la Phase 1.*
