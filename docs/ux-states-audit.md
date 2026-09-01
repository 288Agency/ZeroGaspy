# ZeroGaspy — Audit des états UX (V2)

Matrice de référence pour QA manuel et captures. Chaque état doit avoir : **message clair**, **1 CTA principal**, **pas de culpabilisation**.

| État | Écran(s) | CTA principal attendu | Statut |
|------|-----------|-------------------------|--------|
| Nouvel utilisateur | Onboarding | Scanner ticket ou ajouter | OK |
| Frigo vide | Home | Commencer / Scanner | OK |
| 1 aliment | Home, Inventaire | Voir fiche / Cuisiner ce soir | À tester |
| 50+ aliments | Inventaire | Filtres + recherche | À tester |
| Aliments expirés | Home urgent, ExpiringSoon | Cuisiner / Consommer / Jeter | OK |
| Tout frais | Home | Cuisiner ce soir (non urgent) | OK |
| Aucun historique conso | Home hero | Valeur frigo € estimée | OK |
| Erreur réseau / sync | Compte, sync | Message + réessayer | Partiel |
| Scan impossible | Receipt, barcode | Saisie manuelle | OK |
| Date inconnue | AddFood | Défaut J+7 + calendrier | OK |
| Liste partagée | Lists, Inventaire | Lecture seule / sync | À tester |
| Guest (non connecté) | Tout | Notifs locales, pas push serveur | OK |
| Free vs Premium | Meal planner, scan, recettes IA | PaywallSheet trigger adapté | OK |

## Prochaines passes

1. Captures iPhone pour chaque ligne « À tester »
2. Wording anxiogène → guidant (Home hero fait)
3. Micro-feedback consommé / ajouté / jeté (toast + haptic)
