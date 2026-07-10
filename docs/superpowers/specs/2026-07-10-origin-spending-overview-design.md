# Reproduction de la page « Spending » (Overview) d'Origin dans SpendingView

**Date :** 2026-07-10
**Statut :** validé (content-area only, tab bar statique)

## Objectif

Remplacer le contenu actuel de `SpendingView` (`TransactionsPanel` / `CategoriesPanel` / `RulesPanel`) par une reproduction visuelle de l'onglet **Overview** de la page « Spending » d'Origin (screenshot de référence), construite avec les composants de `packages/ui` et des données mockées. La sidebar et le header Fela existants sont conservés — seule la zone de contenu change.

## Hors périmètre

- Sidebar Origin (Track/Services) et header Origin (titre « Spending », icônes cadeau/profil/aide/réglages en haut à droite) : on garde les composants Fela existants.
- Fonctionnement réel des onglets (Overview / Breakdown & budget / Transactions / Recurring / Reports) : barre rendue statiquement, seul **Overview** est actif visuellement ; les autres onglets ne changent rien.
- Onglets internes de la carte breakdown (Expenses / Budget) : Expenses actif, Budget inerte.
- Branchement aux vraies données (comptes, transactions, catégories) : toutes les valeurs sont statiques.
- Logique interactive réelle : toggles (courbe/calendrier), boutons sparkles, dropdown « vs January », croix de fermeture du bloc promo — rendus sans handlers fonctionnels.
- Responsive mobile : cible desktop (app Electron), largeur de colonne droite fixe à 360px.

## Architecture

### Nouveaux fichiers

```
apps/desktop/src/renderer/src/components/spending-overview/
  SpendingTabs.tsx           — barre d'onglets statique (Overview actif)
  SpendTrendCard.tsx         — grande carte « SPEND THIS MONTH » + line/area chart
  LatestTransactionsCard.tsx — carte « LATEST TRANSACTIONS » : liste de 5 transactions
  UpcomingTransactionsCard.tsx — carte « UPCOMING TRANSACTIONS » : mini-calendrier + empty state
  BudgetPromoCard.tsx        — carte verte « MORE FROM ORIGIN » / « Build a budget with AI »
  CategoryBreakdownCard.tsx  — carte « CATEGORY BREAKDOWN » : donut + liste de catégories
  mock-data.ts               — constantes mockées (séries chart, jours, transactions, catégories)
```

### Fichier modifié

- `apps/desktop/src/renderer/src/views/SpendingView.tsx` : compose la barre d'onglets + la grille. Les anciens panels (`TransactionsPanel`, `CategoriesPanel`, `RulesPanel`) ne sont plus importés ici mais leurs fichiers restent en place.

## Layout

`SpendingView` rend :

```tsx
<div className="flex flex-col gap-6 p-8">
  <SpendingTabs />
  <div className="grid grid-cols-[1fr_360px] items-start gap-6">
    <div className="flex flex-col gap-6">
      <SpendTrendCard />
      <div className="grid grid-cols-2 gap-6">
        <LatestTransactionsCard />
        <UpcomingTransactionsCard />
      </div>
    </div>
    <div className="flex flex-col gap-6">
      <BudgetPromoCard />
      <CategoryBreakdownCard />
    </div>
  </div>
</div>
```

Le scroll vertical est déjà géré par le shell (`RootLayout`).

## Détail des composants

### SpendingTabs

- Rangée horizontale d'onglets : `Overview` (actif) / `Breakdown & budget` / `Transactions` / `Recurring` / `Reports`.
- Overview rendu comme pilule active : fond clair (`bg-muted`/`bg-accent`), `rounded-md`, texte foncé. Les autres en `text-muted-foreground`, sans fond.
- Éléments statiques : `<button>` ou `<span>` non fonctionnels (pas de navigation). Pas de composant `Tabs` (inexistant dans `packages/ui`) — stylé inline.

### SpendTrendCard

- `Card` occupant toute la largeur de la colonne gauche.
- En-tête : label « SPEND THIS MONTH » en petites majuscules espacées (`text-xs uppercase tracking-widest text-muted-foreground`) ; à droite un `ToggleGroup type="single"` à 2 items (icône courbe / icône calendrier, `lucide-react` : `LineChart` / `Calendar`, courbe sélectionnée par défaut) + bouton icône sparkles (outline arrondi).
- Ligne montant : `$72` en grand (`text-4xl font-semibold`) ; légende « ● February » (puce bleue) en dessous ; à droite un bouton d'aspect dropdown « ⋯ vs January ▾ » (variant outline, `rounded-full`, non fonctionnel).
- Graphique Recharts via `ChartContainer` :
  - Série **February** : trait bleu plein (`stroke` bleu), remplissage dégradé bleu → transparent (`linearGradient`), point terminal marqué (dot au dernier point).
  - Série **vs January** : trait gris en pointillés (`strokeDasharray`), sans remplissage, point terminal gris.
  - Axe X avec ticks `01` / `08` / `15` / `22` ; pas d'axe Y visible ; pas de lignes de grille marquées (fond neutre).
  - Forme : plateau bas jusqu'à ~jour 11, marche montante, puis plateau jusqu'à fin de mois (courbe February plus basse que January).

### LatestTransactionsCard

- `Card`. En-tête « LATEST TRANSACTIONS › » + bouton icône sparkles à droite.
- Liste de 5 lignes mockées, chacune : tuile carrée d'icône catégorie à gauche, nom + date empilés, montant aligné à droite.
  - `Taobao` — Feb 12 — `$71.95` — tuile orange (`lucide-react` `ShoppingBag`).
  - `To SGD (Added)` — Feb 12 — `+$50.00` — icône `ArrowLeftRight`, ligne atténuée (`text-muted-foreground`) + icône `EyeOff` avant le montant.
  - `Kraken Exchange` — Jan 21 — `$10.00` — icône `ArrowLeftRight`, ligne atténuée + `EyeOff`.
  - `Grab` — Jan 21 — `$106.39` — tuile orange (`lucide-react` `Car`).
  - `Geo Adventure Indonesia` — Jan 13 — `$291.78` — tuile neutre (`lucide-react` `Tag`).
- Les montants positifs (`+$50.00`) et lignes cachées sont visuellement atténués comme sur le screenshot.

### UpcomingTransactionsCard

- `Card`. En-tête « UPCOMING TRANSACTIONS › » + bouton icône sparkles.
- Grille calendrier : en-tête des jours `SUN MON TUE WED THU FRI SAT` (`text-xs text-muted-foreground`), puis deux semaines de cellules : `22 23 24 25 26 27 28` puis `1 2 … 7`. Les jours de la semaine précédente (22–26, 28) atténués ; `27` surligné (pastille `bg-muted rounded-full`).
- Encart empty-state centré superposé/inséré dans la grille : petite carte « Add your recurring bills and subscriptions to see what's coming up. » (`text-sm text-muted-foreground`, `border rounded-lg`, centrée).

### BudgetPromoCard

- Carte à fond vert dégradé (`bg-gradient-to-br` de verts sombres), texte blanc, coins arrondis.
- Ligne haute : « MORE FROM ORIGIN » (petites majuscules) + croix `X` (`lucide-react`) à droite.
- Titre « Build a budget with AI » en police serif (`font-serif text-2xl`).
- Sous-texte : « AI Budget Builder creates a smart budget based on your real spending in seconds. » (`text-sm text-white/80`).

### CategoryBreakdownCard

- `Card`. En-tête « CATEGORY BREAKDOWN » + bouton icône sparkles à droite.
- Sous-onglets « Expenses » / « Budget » façon underline : Expenses actif (texte foncé + trait sous le label), Budget en `text-muted-foreground` (inerte).
- Donut Recharts (`PieChart` + `Pie` avec `innerRadius`/`outerRadius`) : un seul segment orange (100 %) sur piste claire ; label centré `$72` (grand) + « Spent this month » (muted) via élément superposé au centre.
- Liste de catégories, chacune : pastille ronde colorée d'icône, nom + « x% of expenses » empilés, montant à droite.
  - `Shopping` — 100% of expenses — `$72` — orange (`ShoppingBag`).
  - `Drinks & dining` — 0% of expenses — `$0` — jaune (`Utensils`).
  - `Childcare & education` — 0% of expenses — `$0` — bleu (`GraduationCap`).
  - `Auto & transport` — 0% of expenses — `$0` — brun/rouge (`Car`).
  - `Entertainment` — 0% of expenses — `$0` — violet (`Gamepad2`).

## Données mockées (`mock-data.ts`)

- `SPEND_SERIES` : ~28 points `{ day, february, january }`, February en marche montante vers 72, January plus haut (courbe de comparaison en pointillés). Points nuls/plats au début.
- `UPCOMING_DAYS` : cellules du mini-calendrier `{ day, muted?: boolean, highlighted?: boolean }`.
- `LATEST_TRANSACTIONS` : `{ name, date, amount, icon, tone: 'orange' | 'neutral', hidden?: boolean, positive?: boolean }`.
- `EXPENSE_CATEGORIES` : `{ name, percent, amount, icon, color }`.

## Composants UI

Aucun nouveau primitive nécessaire. Réutilisation :

- `Card` (`@repo/ui/components/card`)
- `Button` (`@repo/ui/components/button`) — boutons sparkles, dropdown « vs January ».
- `ToggleGroup` / `ToggleGroupItem` (`@repo/ui/components/toggle-group`) — bascule courbe/calendrier.
- `ChartContainer` et primitives Recharts (`@repo/ui/components/chart`, `recharts` 3.8) — line/area chart et donut.
- `lucide-react` pour toutes les icônes (aucun asset externe).

Les barres d'onglets (page + Expenses/Budget) sont stylées inline (pas de composant `Tabs` dans le repo).

## Gestion des erreurs

Aucun I/O ni état asynchrone : composants purs sur constantes. Pas de cas d'erreur à gérer.

## Tests / vérification

- `pnpm lint` et `pnpm check-types` passent.
- Vérification visuelle via la skill `apps/desktop:verify` (lancer l'app, naviguer sur Spending, comparer au screenshot).
