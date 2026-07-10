# ADR 0001 — Modèle de budget « Origin » (revenu + total à répartir, « reste » dérivé)

**Date :** 2026-07-10
**Statut :** accepté
**Rouvre :** décision #13 de la [roadmap](../roadmap.md) (« Budgets simples — un montant cible mensuel par catégorie »)

## Contexte

La roadmap tranchait deux fois sur le budget :

- **Décision #13 (phase 2)** — « Budgets simples : un montant cible mensuel par
  catégorie ; les rapports comparent réalisé vs prévu. Nouvelle table
  `budgets`. »
- **Hors périmètre** — « Enveloppes YNAB : philosophie de budget entière, autre
  produit. »

L'implémentation de l'onglet Budget (issue #35) adopte le modèle **Origin** :
l'utilisateur saisit un **revenu net** et un **budget total** à répartir sur le
mois, puis voit une unique ligne dérivée **« Tout le reste »** égale au total.
Les lignes par catégorie viendront ensuite ; « Tout le reste » se réduira au fur
et à mesure qu'on leur affecte des montants.

Ce modèle ne correspond exactement ni à #13 (« un montant cible **par
catégorie** » d'abord) ni aux enveloppes YNAB explicitement rejetées. Il faut
donc consigner la décision.

## Décision

On retient le modèle Origin, **plus léger que YNAB** et légèrement différent de
la formulation d'origine de #13 :

- **Un total à répartir**, pas une somme de cibles par catégorie construite de
  zéro. Les catégories découpent le total ; le non-affecté reste visible comme
  « Tout le reste » (`max(0, totalBudget − Σ lignes)`), jamais stocké, toujours
  recalculé.
- **Pas de report** (rollover) du non-dépensé d'un mois sur l'autre.
- **Pas de « money to assign » cumulatif** ni de discipline « chaque euro a un
  rôle » façon YNAB.
- **Un revenu net** saisi à part du budget total, pour comparer ce qu'on gagne à
  ce qu'on prévoit de dépenser.

Concrètement : table `budgets` (un budget par mois, clé `"YYYY-MM"`), routeur
`budgets` (`get` / `create` / `update`), « Tout le reste » dérivé côté API.

## Conséquences

- **Rouvre #13** : la table `budgets` arrive comme prévu, mais l'unité première
  est le **total mensuel** (avec un « reste » dérivé), pas la cible par
  catégorie. Les cibles par catégorie deviennent un raffinement (des lignes qui
  entament le reste) plutôt que la fondation.
- **Cohérent avec le hors-périmètre YNAB** : ni report, ni money-to-assign, ni
  enveloppes cumulatives. On reste du côté « voir où part l'argent », pas
  « imposer un rôle à chaque euro ».
- **Vocabulaire introduit** (consigné ici, faute de `CONTEXT.md` à ce stade) :
  _revenu net_, _budget total_, _ligne de budget_ (par catégorie) et _« Tout le
  reste »_ (le reste dérivé, `max(0, totalBudget − Σ lignes)`). À reprendre dans
  le glossaire le jour où un `CONTEXT.md` est créé (voir `docs/agents/domain.md`).
