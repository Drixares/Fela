# Roadmap fonctionnelle

> Issue d'une session de cadrage le 2026-07-07. Chaque décision ci-dessous a été
> pesée explicitement ; si une hypothèse change (multi-devise, synchro bancaire…),
> revenir à la section « Hors périmètre » avant d'ajouter quoi que ce soit.

## Vision

Fela est une application desktop **locale** (Electron + SQLite) qui répond à la
question « **Où part mon argent ?** » par le constat : importer ses relevés,
classer sans effort, regarder les rapports. Mono-devise (EUR) en v1. Construite
pour un usage personnel d'abord, en gardant l'option produit ouverte (textes
centralisés, données exportables).

## Décisions structurantes

| Sujet             | Décision                                                                                                 | Alternative écartée                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Ingestion         | Saisie manuelle + import CSV/OFX                                                                         | Synchro bancaire API (exige un backend, casse le local-first)                            |
| Catégorisation    | Règles utilisateur + suggestion par historique du payee                                                  | ML / cloud ; manuel pur (80 clics par import)                                            |
| Catégories        | Deux niveaux : groupe optionnel → catégorie feuille. Les transactions pointent toujours vers une feuille | Plat (rapports illisibles) ; arbre libre (récursion partout)                             |
| Budgets           | Montant cible mensuel par catégorie, en phase 2                                                          | Enveloppes YNAB (redéfinit tout le produit)                                              |
| Devises           | Mono-devise EUR assumée ; le champ `currency` reste en base                                              | Conversion de taux (projet dans le projet)                                               |
| Doublons d'import | Prévisualisation avec doublons signalés avant validation                                                 | Dédup silencieuse (faux positif = transaction perdue sans trace)                         |
| Récurrences       | Détection d'abonnements (lecture seule, dérivée de l'historique)                                         | Échéancier prévisionnel (sous-système entier : occurrences, pending…)                    |
| Sauvegarde        | Backups auto rotatifs + export CSV/JSON + restauration                                                   | Sync cloud multi-appareils                                                               |
| Rapprochement     | Vérification de solde légère + transaction d'ajustement                                                  | Statut pointé/non-pointé par transaction (discipline YNAB, inadaptée à l'import fichier) |
| Distribution      | Perso d'abord ; UI française, textes centralisés dès le départ                                           | i18n/packaging dès la v1 (+30 % de travail avant la première valeur)                     |

## V1 — le noyau

L'app est « complète en son genre » à la fin de cette phase : importer → classer
→ comprendre.

1. **Comptes** — création, édition, archivage ; solde initial ; solde dérivé des
   transactions (schéma déjà en place).
2. **Catégories à deux niveaux** — groupes optionnels → catégories feuilles.
   Seed français par défaut (~8 groupes, ~25 catégories), entièrement éditable.
   ⚠️ Seul changement de schéma requis : ajouter les groupes de catégories.
3. **Saisie manuelle** de transactions, virements entre comptes inclus
   (déjà modélisés en deux jambes liées par `transferId`).
4. **Assistant d'import CSV/OFX** — l'écran le plus important après le
   dashboard :
   - choix du compte cible ;
   - mapping des colonnes CSV, mémorisé par compte ;
   - déduplication : `FITID` pour l'OFX, empreinte heuristique
     (compte + date + montant + libellé normalisé) pour le CSV —
     prévoir le stockage des empreintes en schéma ;
   - prévisualisation : « 43 nouvelles transactions, 12 doublons probables
     ignorés », dépliable et corrigeable avant validation.
5. **Catégorisation assistée** —
   - moteur de règles « libellé contient X → catégorie Y », appliqué à
     l'import, éditable ;
   - suggestion par historique : la dernière catégorie utilisée pour un payee
     devient la proposition par défaut.
6. **Liste de transactions outillée** — recherche plein texte (payee/note),
   filtres combinables (période, compte, catégorie, montant, **non-catégorisées**),
   sélection multiple + recatégorisation en masse, « créer une règle depuis
   cette transaction » avec application rétroactive proposée.
7. **Rapports noyau** —
   - répartition des dépenses par groupe, drill-down groupe → catégorie →
     transactions ;
   - cash flow mensuel (revenus vs dépenses, 12 mois glissants) ;
   - sélecteur de période commun (ce mois, mois dernier, 3/6/12 mois,
     personnalisé).
8. **Sauvegarde et portabilité** — backups automatiques rotatifs de la base
   (dossier configurable, pointable vers Dropbox/iCloud Drive), export
   CSV/JSON complet, restauration depuis un backup.
9. **Premier lancement** — seed de catégories + états vides guidés : chaque
   écran vide mène à l'action suivante (créer un compte → importer → voir le
   premier camembert). Pas de wizard multi-étapes.

## V1.5 — vues supplémentaires

Uniquement des lectures nouvelles sur les données existantes — zéro changement
de schéma.

10. **Tendance par catégorie** — courbe mensuelle d'une catégorie ou d'un
    groupe, comparaison de périodes (« mes courses ont-elles augmenté ? »).
11. **Patrimoine (net worth)** — somme des soldes de tous les comptes dans le
    temps (« est-ce que je m'enrichis ? »).
12. **Détection d'abonnements** — vue « Récurrents : X €/mois », calculée par
    heuristique (même payee, montant proche, intervalle régulier).

## Phase 2 — l'intention et la confiance

13. **Budgets simples** — un montant cible mensuel par catégorie ; les rapports
    comparent réalisé vs prévu (barre de progression). Nouvelle table `budgets`.
    ⚠️ Rouvert par le modèle « Origin », plus léger (un total mensuel + un
    « reste » dérivé, sans report ni money-to-assign) — voir
    [ADR 0001](adr/0001-origin-budget-model.md).
14. **Vérification de solde** — saisie du solde réel affiché par la banque,
    calcul de l'écart, création d'une transaction d'ajustement traçable
    (catégorie « Ajustement ») pour recaler.

## Phase 3 — si l'app prouve sa valeur

15. **Distribution** — packaging signé (notarisation macOS, installeurs),
    auto-update, migrations de base entre versions.
16. **i18n** — préparée dès la v1 par la centralisation des textes ; ajout de
    l'anglais à ce stade seulement.

## Hors périmètre (explicitement)

- **Synchro bancaire API** (Bridge, Powens, GoCardless…) — exige backend,
  credentials, agréments ; extension possible mais jamais une fondation.
- **Multi-devise fonctionnel** — le champ `currency` reste en base pour éviter
  une migration future ; aucune UI ni conversion. Étape suivante raisonnable si
  le besoin devient réel : rapports séparés par devise, sans conversion.
- **Enveloppes YNAB** — philosophie de budget entière, autre produit.
- **Prévisionnel / échéancier** — transactions planifiées, projection de solde.
- **Sync cloud multi-appareils** — conflits, chiffrement, comptes utilisateur.

## Conséquences immédiates sur le schéma

À faire pendant que le schéma est jeune (avant d'accumuler des données) :

1. **Groupes de catégories** — table `category_groups` (ou `groupId` nullable
   sur `categories`).
2. **Empreintes d'import** — colonnes sur `transactions` (ou table dédiée)
   pour la déduplication : `FITID` OFX et empreinte heuristique CSV.
