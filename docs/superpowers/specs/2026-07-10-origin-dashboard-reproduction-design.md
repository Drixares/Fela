# Reproduction du dashboard Origin dans HomeView

**Date :** 2026-07-10
**Statut :** validé (approche A)

## Objectif

Remplacer le contenu actuel de `HomeView` (AccountsPanel / ReportsPanel / CashFlowPanel) par une reproduction visuelle du dashboard Origin (screenshot de référence), construite avec les composants shadcn de `packages/ui` et des données mockées. La sidebar et le header Fela existants sont conservés tels quels — seule la zone de contenu change.

## Hors périmètre

- Sidebar Origin (Track/Services) et header Origin (greeting, tabs Overview/Net worth, icônes) : on garde les composants Fela existants.
- Branchement aux vraies données (comptes, transactions) : viendra plus tard ; toutes les valeurs sont statiques.
- Logique interactive réelle : les boutons (Forecast, Add account, Start budgeting, Connect credit score) et croix de fermeture sont rendus sans handlers fonctionnels.
- Responsive mobile : cible desktop (app Electron), largeur de colonne droite fixe.

## Architecture

### Nouveaux fichiers

```
apps/desktop/src/renderer/src/components/dashboard/
  NetWorthCard.tsx      — carte net worth + area chart + périodes + Add account
  SpendingCard.tsx      — carte dépenses : calendrier février + transactions récentes
  OnboardingCard.tsx    — carte verte "Make the most of Origin"
  RecapCard.tsx         — carte "Daily market brief" à bordure dégradée
  BudgetCard.tsx        — carte "Budget your money" + Progress + CTA noir
  CreditScoreCard.tsx   — carte "Track your credit score" + segments + CTA noir
  mock-data.ts          — constantes mockées (série net worth, jours de février, transactions)

packages/ui/src/components/progress.tsx
  — composant Progress shadcn basé sur Base UI (@base-ui/react), convention du repo
```

### Fichier modifié

- `apps/desktop/src/renderer/src/views/HomeView.tsx` : compose la grille. Les anciens panels (`AccountsPanel`, etc.) ne sont plus importés ici mais leurs fichiers restent en place.

## Layout

`HomeView` rend :

```tsx
<div className="grid grid-cols-[1fr_360px] items-start gap-6 p-8">
  <div className="flex flex-col gap-6">
    <NetWorthCard />
    <SpendingCard />
  </div>
  <div className="flex flex-col gap-6">
    <OnboardingCard />
    <RecapCard />
    <BudgetCard />
    <CreditScoreCard />
  </div>
</div>
```

Le scroll vertical est déjà géré par le shell (`RootLayout`).

## Détail des composants

### NetWorthCard

- `Card` avec en-tête : label "NET WORTH ›" en petites majuscules espacées (`text-xs uppercase tracking-widest text-muted-foreground`), à droite un bouton icône "⋮" (ghost) et un bouton icône sparkles (outline arrondi).
- Montant `$1,072` en grand, sous-ligne `$0 (0%)` en muted ; bouton `Forecast ›` (variant outline, arrondi) aligné à droite.
- Area chart Recharts via `ChartContainer` : série mockée croissante, trait gris clair, dégradé gris → transparent (`linearGradient`), pas d'axes visibles, lignes de grille horizontales en pointillés.
- Encart centré superposé au chart : "Building wealth takes time. Your net worth graph takes a week to populate." (petite carte blanche ombrée, `absolute` centrée).
- `ToggleGroup type="single"` : 1W / 1M / 3M / YTD / ALL, valeur par défaut aucune sélection marquée (comme le screenshot, items neutres).
- Bouton pleine largeur `Add account` : variant outline, `rounded-full`, hauteur généreuse.

### SpendingCard

- En-tête "SPENT IN FEBRUARY ›" (même style de label) + bouton icône sparkles à droite.
- Corps en deux colonnes (`grid grid-cols-2 gap-8`) :
  - **Calendrier** : montant `$72` en grand, puis grille `grid-cols-7 gap-1` de cellules jour (`border rounded-md p-1.5`, numéro du jour + montant `$0` en muted). Le 12 est actif : fond bleu (`bg-blue-500 text-white`), montant `$72`. Semaines 1–28 affichées, la dernière rangée partiellement coupée est simplement omise ou rendue en entier (choix : rendue en entier jusqu'au 28).
  - **Transactions récentes** : label "RECENT TRANSACTIONS", liste de 4 lignes mockées :
    - Taobao — Feb 12 — `$71.95` (icône carrée orange)
    - To SGD (Added) — Feb 12 — `+$50.00` (icône flèches, icône œil barré)
    - Kraken Exchange — Jan 21 — `$10.00` (icône flèches, icône œil barré)
    - Grab — `$106.39` (icône orange, ligne partiellement visible sur le screenshot → rendue en entier)
- Icônes : `lucide-react` (ShoppingBag/ArrowLeftRight/EyeOff…), pas d'assets externes.

### OnboardingCard

- Carte à fond vert foncé dégradé (`bg-gradient-to-br from-[verts sombres]`), texte blanc, coins arrondis.
- Ligne haute : "COMPLETE ONBOARDING" (petites majuscules) + croix `X` à droite.
- Titre "Make the most of Origin" en police serif (`font-serif`).
- Progression : 3 segments horizontaux (flex gap), le premier plein (blanc), les deux autres translucides ; sous-texte "33% complete".

### RecapCard

- `Card` avec bordure dégradée bleue : wrapper `rounded-xl p-px bg-gradient-to-r from-blue-300 to-indigo-300` autour d'un fond blanc.
- "PERSONAL RECAP" + croix à droite ; titre "Daily market brief" en serif ; sous-texte muted "US PPI data looms over markets…".

### BudgetCard

- "BUDGET IN FEBRUARY ›" + bouton icône sparkles.
- Texte "Budget your money." ; `Progress` (nouveau composant) à 0 % avec piste vert-lime pâle et mention "0%" à droite.
- Bouton pleine largeur noir "Start budgeting" (variant default, `rounded-lg`).

### CreditScoreCard

- "CREDIT SCORE ›" ; texte "Track your credit score." ; rangée de 4 segments gris (`Skeleton`-like, simples `div bg-muted rounded`) ; bouton noir pleine largeur "Connect credit score".

## Nouveau composant packages/ui : progress.tsx

- Basé sur `Progress` de `@base-ui/react` (convention du repo : Base UI, pas Radix — voir `components.json` et les composants existants).
- API standard shadcn : `<Progress value={number} max={number} className={...} />`, styles par défaut `h-2 rounded-full bg-primary/20`, indicateur `bg-primary` ; les couleurs spécifiques (vert lime du BudgetCard) passent par `className`.
- Ajouté de préférence via `pnpm dlx shadcn@latest add progress` dans `packages/ui` (registry Base UI configurée par `components.json`), sinon écrit à la main sur le modèle des composants existants (ex. `checkbox.tsx`).

## Données mockées (`mock-data.ts`)

- `NET_WORTH_SERIES` : ~30 points croissants avec un plateau puis une montée finale (forme du screenshot).
- `FEBRUARY_DAYS` : jours 1–28, `{ day, amount }`, tous à 0 sauf le 12 à 72.
- `RECENT_TRANSACTIONS` : `{ name, date, amount, kind: 'purchase' | 'transfer', hidden?: boolean }`.

## Gestion des erreurs

Aucun I/O ni état asynchrone : composants purs sur constantes. Pas de cas d'erreur à gérer.

## Tests / vérification

- `pnpm lint` et `pnpm check-types` passent.
- Vérification visuelle via la skill `apps/desktop:verify` (lancer l'app, comparer au screenshot).
