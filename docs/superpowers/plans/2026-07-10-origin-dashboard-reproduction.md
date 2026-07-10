# Origin Dashboard Reproduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le contenu de `HomeView` par une reproduction visuelle du dashboard Origin (données mockées), construite avec les composants shadcn de `packages/ui`.

**Architecture:** Un nouveau dossier `apps/desktop/src/renderer/src/components/dashboard/` contient un composant par carte plus les données mockées ; `HomeView` les compose dans une grille 2 colonnes (`1fr` / `360px`). Un composant `Progress` basé sur Base UI est ajouté à `packages/ui`. Aucune logique interactive réelle, aucun I/O.

**Tech Stack:** React 19, Tailwind v4, shadcn style Base UI (`@base-ui/react`), Recharts via `ChartContainer` (`packages/ui/src/components/chart.tsx`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-10-origin-dashboard-reproduction-design.md`

## Global Constraints

- **Base UI, pas Radix** : tout nouveau composant `packages/ui` s'appuie sur `@base-ui/react` (convention du repo, voir `checkbox.tsx`).
- **Style de code** : `packages/ui` = doubles quotes + point-virgules ; `apps/desktop` = simples quotes, pas de point-virgules, composants `function Xxx(): React.JSX.Element`. Les blocs de code de ce plan respectent déjà ces styles — les copier tels quels.
- **Pas de framework de test unitaire** dans le repo : la vérification de chaque tâche = typecheck + lint (`pnpm -C packages/ui check-types` / `pnpm -C apps/desktop typecheck:web` / `pnpm -C apps/desktop lint`), plus une vérification visuelle finale via la skill `apps/desktop:verify`. Ne pas installer de framework de test (YAGNI).
- **Aucun handler fonctionnel** : boutons et croix rendus sans `onClick` (reproduction visuelle).
- **`font-serif`** : aucune police serif n'est configurée dans le thème ; la pile serif par défaut de Tailwind (Georgia/ui-serif) est acceptable pour les titres "Make the most of Origin" et "Daily market brief".
- **Working tree sale** : le repo contient d'autres modifications non commitées. Chaque commit n'ajoute QUE les fichiers listés dans sa tâche (`git add <chemins explicites>`, jamais `git add -A`).
- Toutes les commandes se lancent depuis la racine du repo : `/Users/matteomarchelli/web-projects/fela`.

---

### Task 1: Composant Progress dans packages/ui

**Files:**
- Create: `packages/ui/src/components/progress.tsx`

**Interfaces:**
- Consumes: `Progress` de `@base-ui/react/progress` (parts `Root`, `Track`, `Indicator` — déjà présent dans la version installée), `cn` de `@repo/ui/lib/utils`.
- Produces: `Progress` — props `ProgressPrimitive.Root.Props & { indicatorClassName?: string }`. `className` s'applique à la piste (Track), `indicatorClassName` à l'indicateur. Usage : `<Progress value={0} className="bg-lime-200/70" />`. Importable via `@repo/ui/components/progress` (l'export `./components/*` du package.json couvre déjà ce chemin, rien à modifier).

- [ ] **Step 1: Écrire le composant**

Créer `packages/ui/src/components/progress.tsx` :

```tsx
"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@repo/ui/lib/utils";

function Progress({
  className,
  indicatorClassName,
  ...props
}: ProgressPrimitive.Root.Props & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" {...props}>
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(
          "block h-2 w-full overflow-hidden rounded-full bg-primary/20",
          className
        )}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "block h-full rounded-full bg-primary transition-all",
            indicatorClassName
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
```

Note : l'`Indicator` de Base UI applique lui-même sa largeur (`width: <value>%`) via style inline à partir de `value`/`max` du Root — ne pas ajouter de calcul de largeur.

- [ ] **Step 2: Vérifier typecheck + lint**

Run: `pnpm -C packages/ui check-types && pnpm -C packages/ui lint`
Expected: exit 0, aucune erreur. Si `ProgressPrimitive.Root.Props` n'existe pas sous ce nom dans la version installée, ouvrir `node_modules/@base-ui/react/progress/index.d.ts` pour trouver le type de props exact du Root et l'utiliser (même démarche que `checkbox.tsx` avec `CheckboxPrimitive.Root.Props`).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/progress.tsx
git commit -m "feat(ui): add Progress component on Base UI"
```

---

### Task 2: Données mockées et label de section partagé

**Files:**
- Create: `apps/desktop/src/renderer/src/components/dashboard/mock-data.ts`
- Create: `apps/desktop/src/renderer/src/components/dashboard/SectionLabel.tsx`

**Interfaces:**
- Consumes: rien (constantes pures + lucide-react).
- Produces:
  - `NET_WORTH_SERIES: { day: number; value: number }[]`
  - `FEBRUARY_DAYS: { day: number; amount: number }[]` (jours 1–28, tout à 0 sauf le 12 à 72)
  - `RECENT_TRANSACTIONS: RecentTransaction[]` avec `interface RecentTransaction { name: string; date: string; amount: string; kind: 'purchase' | 'transfer'; hidden?: boolean }`
  - `SectionLabel({ children, withChevron = true }): React.JSX.Element` — le label "NET WORTH ›" en petites majuscules espacées, réutilisé par toutes les cartes.

- [ ] **Step 1: Écrire mock-data.ts**

Créer `apps/desktop/src/renderer/src/components/dashboard/mock-data.ts` :

```ts
/** Static data mirroring the Origin dashboard screenshot — no live data yet. */

export interface NetWorthPoint {
  day: number
  value: number
}

/** Plateau then a late climb, matching the reference chart shape. */
export const NET_WORTH_SERIES: NetWorthPoint[] = [
  0, 40, 80, 120, 160, 200, 230, 260, 290, 310, 330, 345, 355, 360, 365, 370,
  372, 375, 378, 380, 385, 395, 420, 460, 520, 600, 700, 820, 950, 1072
].map((value, index) => ({ day: index + 1, value }))

export interface FebruaryDay {
  day: number
  amount: number
}

export const FEBRUARY_DAYS: FebruaryDay[] = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  amount: i + 1 === 12 ? 72 : 0
}))

export interface RecentTransaction {
  name: string
  date: string
  amount: string
  kind: 'purchase' | 'transfer'
  hidden?: boolean
}

export const RECENT_TRANSACTIONS: RecentTransaction[] = [
  { name: 'Taobao', date: 'Feb 12', amount: '$71.95', kind: 'purchase' },
  { name: 'To SGD (Added)', date: 'Feb 12', amount: '+$50.00', kind: 'transfer', hidden: true },
  { name: 'Kraken Exchange', date: 'Jan 21', amount: '$10.00', kind: 'transfer', hidden: true },
  { name: 'Grab', date: 'Feb 10', amount: '$106.39', kind: 'purchase' }
]
```

- [ ] **Step 2: Écrire SectionLabel.tsx**

Créer `apps/desktop/src/renderer/src/components/dashboard/SectionLabel.tsx` :

```tsx
import { ChevronRightIcon } from 'lucide-react'

/** Petites majuscules espacées façon Origin ("NET WORTH ›"). */
export function SectionLabel({
  children,
  withChevron = true
}: {
  children: React.ReactNode
  withChevron?: boolean
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
      {children}
      {withChevron ? <ChevronRightIcon className="size-3.5" /> : null}
    </span>
  )
}
```

- [ ] **Step 3: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0. (Les fichiers ne sont pas encore importés — un éventuel avertissement "unused export" n'existe pas dans la config ESLint du repo.)

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/dashboard/mock-data.ts apps/desktop/src/renderer/src/components/dashboard/SectionLabel.tsx
git commit -m "feat(renderer): mock data and section label for Origin dashboard"
```

---

### Task 3: NetWorthCard

**Files:**
- Create: `apps/desktop/src/renderer/src/components/dashboard/NetWorthCard.tsx`

**Interfaces:**
- Consumes: `NET_WORTH_SERIES` et `SectionLabel` (Task 2), `Card/CardHeader/CardContent`, `Button`, `ChartContainer` + `ChartConfig`, `ToggleGroup/ToggleGroupItem` de `@repo/ui`, `Area/AreaChart/CartesianGrid` de `recharts`.
- Produces: `NetWorthCard(): React.JSX.Element` — carte autonome sans props.

- [ ] **Step 1: Écrire le composant**

Créer `apps/desktop/src/renderer/src/components/dashboard/NetWorthCard.tsx` :

```tsx
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { ChartContainer, type ChartConfig } from '@repo/ui/components/chart'
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group'
import { ChevronRightIcon, EllipsisVerticalIcon, SparklesIcon } from 'lucide-react'
import { Area, AreaChart, CartesianGrid } from 'recharts'

import { NET_WORTH_SERIES } from './mock-data'
import { SectionLabel } from './SectionLabel'

const chartConfig = {
  value: { label: 'Net worth', color: 'var(--color-zinc-300)' }
} satisfies ChartConfig

const PERIODS = ['1W', '1M', '3M', 'YTD', 'ALL']

/** Carte net worth : montant, area chart gris, sélecteur de période, Add account. */
export function NetWorthCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Net worth</SectionLabel>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="More options">
            <EllipsisVerticalIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Ask AI"
            className="rounded-lg text-indigo-500"
          >
            <SparklesIcon />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-4xl font-semibold tracking-tight">$1,072</p>
            <p className="mt-1 text-sm text-muted-foreground">$0 (0%)</p>
          </div>
          <Button variant="outline" className="rounded-lg">
            Forecast
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="relative">
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart
              data={NET_WORTH_SERIES}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={1.5}
                fill="url(#netWorthFill)"
              />
            </AreaChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-64 rounded-xl bg-card px-5 py-3 text-center text-sm text-muted-foreground shadow-lg ring-1 ring-foreground/5">
              Building wealth takes time. Your net worth graph takes a week to populate.
            </p>
          </div>
        </div>
        <ToggleGroup className="self-center">
          {PERIODS.map((period) => (
            <ToggleGroupItem key={period} value={period} className="px-4">
              {period}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="lg" className="w-full rounded-full">
          Add account
        </Button>
      </CardContent>
    </Card>
  )
}
```

Notes :
- `ToggleGroup` (Base UI) est mono-sélection par défaut — ne pas passer de `type="single"` (prop Radix, inexistante ici). Aucune valeur par défaut : sur le screenshot aucun chip n'est marqué.
- `ChartContainer` génère `--color-value` à partir de la clé `value` du config ; `var(--color-zinc-300)` est exposée par le thème Tailwind v4.

- [ ] **Step 2: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0. Si `ToggleGroup` exige une prop non prévue, consulter `packages/ui/src/components/toggle-group.tsx` (props = `ToggleGroupPrimitive.Props`).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/dashboard/NetWorthCard.tsx
git commit -m "feat(renderer): net worth card for Origin dashboard"
```

---

### Task 4: SpendingCard

**Files:**
- Create: `apps/desktop/src/renderer/src/components/dashboard/SpendingCard.tsx`

**Interfaces:**
- Consumes: `FEBRUARY_DAYS`, `RECENT_TRANSACTIONS`, `RecentTransaction`, `SectionLabel` (Task 2), `Card/CardHeader/CardContent`, `Button`, `cn`.
- Produces: `SpendingCard(): React.JSX.Element` — carte autonome sans props.

- [ ] **Step 1: Écrire le composant**

Créer `apps/desktop/src/renderer/src/components/dashboard/SpendingCard.tsx` :

```tsx
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { cn } from '@repo/ui/lib/utils'
import { ArrowLeftRightIcon, EyeOffIcon, ShoppingBagIcon, SparklesIcon } from 'lucide-react'

import { FEBRUARY_DAYS, RECENT_TRANSACTIONS, type RecentTransaction } from './mock-data'
import { SectionLabel } from './SectionLabel'

function TransactionIcon({ kind }: { kind: RecentTransaction['kind'] }): React.JSX.Element {
  if (kind === 'purchase') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-600">
        <ShoppingBagIcon className="size-4" />
      </span>
    )
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <ArrowLeftRightIcon className="size-4" />
    </span>
  )
}

/** Carte dépenses : calendrier de février + transactions récentes. */
export function SpendingCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Spent in February</SectionLabel>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Ask AI"
          className="rounded-lg text-indigo-500"
        >
          <SparklesIcon />
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-[1fr_1.1fr] gap-8">
        <div>
          <p className="text-4xl font-semibold tracking-tight">$72</p>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {FEBRUARY_DAYS.map(({ day, amount }) => (
              <div
                key={day}
                className={cn(
                  'rounded-md border border-border/60 p-1.5 text-[11px] leading-tight',
                  amount > 0 && 'border-blue-500 bg-blue-500 text-white'
                )}
              >
                <p>{day}</p>
                <p className={cn('text-muted-foreground', amount > 0 && 'text-white')}>
                  ${amount}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <SectionLabel withChevron={false}>Recent transactions</SectionLabel>
          <ul className="mt-2 flex flex-col divide-y divide-border/60">
            {RECENT_TRANSACTIONS.map((tx) => (
              <li key={tx.name} className="flex items-center gap-3 py-3">
                <TransactionIcon kind={tx.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{tx.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                {tx.hidden ? (
                  <EyeOffIcon className="size-4 text-muted-foreground" />
                ) : null}
                <p className="text-sm">{tx.amount}</p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/dashboard/SpendingCard.tsx
git commit -m "feat(renderer): spending card with february calendar and recent transactions"
```

---

### Task 5: OnboardingCard et RecapCard

**Files:**
- Create: `apps/desktop/src/renderer/src/components/dashboard/OnboardingCard.tsx`
- Create: `apps/desktop/src/renderer/src/components/dashboard/RecapCard.tsx`

**Interfaces:**
- Consumes: `SectionLabel` (Task 2), `Card/CardHeader/CardContent` de `@repo/ui`.
- Produces: `OnboardingCard(): React.JSX.Element` et `RecapCard(): React.JSX.Element` — cartes autonomes sans props.

- [ ] **Step 1: Écrire OnboardingCard.tsx**

Créer `apps/desktop/src/renderer/src/components/dashboard/OnboardingCard.tsx` :

```tsx
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { XIcon } from 'lucide-react'

/** Carte verte "Make the most of Origin" avec progression en 3 segments. */
export function OnboardingCard(): React.JSX.Element {
  return (
    <Card className="bg-gradient-to-br from-emerald-950 via-green-900 to-green-800 text-white ring-0">
      <CardHeader className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.2em] text-white/80 uppercase">
          Complete onboarding
        </span>
        <button type="button" aria-label="Dismiss" className="text-white/70 hover:text-white">
          <XIcon className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <p className="font-serif text-2xl">Make the most of Origin</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-white" />
            <div className="h-1.5 flex-1 rounded-full bg-white/25" />
            <div className="h-1.5 flex-1 rounded-full bg-white/25" />
          </div>
          <p className="text-sm text-white/90">33% complete</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Écrire RecapCard.tsx**

Créer `apps/desktop/src/renderer/src/components/dashboard/RecapCard.tsx` :

```tsx
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { XIcon } from 'lucide-react'

import { SectionLabel } from './SectionLabel'

/** Carte "Daily market brief" à bordure dégradée bleue. */
export function RecapCard(): React.JSX.Element {
  return (
    <div className="rounded-[13px] bg-gradient-to-r from-sky-300 via-blue-300 to-indigo-300 p-px">
      <Card className="ring-0">
        <CardHeader className="flex items-center justify-between">
          <SectionLabel withChevron={false}>Personal recap</SectionLabel>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </CardHeader>
        <CardContent>
          <p className="font-serif text-2xl">Daily market brief</p>
          <p className="mt-1 text-sm text-muted-foreground">
            US PPI data looms over markets...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/dashboard/OnboardingCard.tsx apps/desktop/src/renderer/src/components/dashboard/RecapCard.tsx
git commit -m "feat(renderer): onboarding and recap cards for dashboard right rail"
```

---

### Task 6: BudgetCard et CreditScoreCard

**Files:**
- Create: `apps/desktop/src/renderer/src/components/dashboard/BudgetCard.tsx`
- Create: `apps/desktop/src/renderer/src/components/dashboard/CreditScoreCard.tsx`

**Interfaces:**
- Consumes: `SectionLabel` (Task 2), `Progress` (Task 1, via `@repo/ui/components/progress`), `Card/CardHeader/CardContent`, `Button`.
- Produces: `BudgetCard(): React.JSX.Element` et `CreditScoreCard(): React.JSX.Element` — cartes autonomes sans props.

- [ ] **Step 1: Écrire BudgetCard.tsx**

Créer `apps/desktop/src/renderer/src/components/dashboard/BudgetCard.tsx` :

```tsx
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'
import { Progress } from '@repo/ui/components/progress'
import { SparklesIcon } from 'lucide-react'

import { SectionLabel } from './SectionLabel'

/** Carte budget : progression à 0 % et CTA "Start budgeting". */
export function BudgetCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <SectionLabel>Budget in February</SectionLabel>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Ask AI"
          className="rounded-lg text-indigo-500"
        >
          <SparklesIcon />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-lg font-medium">Budget your money.</p>
        <div className="flex items-center gap-3">
          <Progress value={0} className="bg-lime-200/70" />
          <span className="text-sm text-muted-foreground">0%</span>
        </div>
        <Button size="lg" className="w-full">
          Start budgeting
        </Button>
      </CardContent>
    </Card>
  )
}
```

Note : le variant `default` de `Button` rend `bg-primary` (foncé), conforme au bouton noir du screenshot.

- [ ] **Step 2: Écrire CreditScoreCard.tsx**

Créer `apps/desktop/src/renderer/src/components/dashboard/CreditScoreCard.tsx` :

```tsx
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'

import { SectionLabel } from './SectionLabel'

/** Carte credit score : segments vides et CTA "Connect credit score". */
export function CreditScoreCard(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <SectionLabel>Credit score</SectionLabel>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-lg font-medium">Track your credit score.</p>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((segment) => (
            <div key={segment} className="h-2 flex-1 rounded-full bg-muted" />
          ))}
        </div>
        <Button size="lg" className="w-full">
          Connect credit score
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/dashboard/BudgetCard.tsx apps/desktop/src/renderer/src/components/dashboard/CreditScoreCard.tsx
git commit -m "feat(renderer): budget and credit score cards for dashboard right rail"
```

---

### Task 7: Composition dans HomeView et vérification visuelle

**Files:**
- Modify: `apps/desktop/src/renderer/src/views/HomeView.tsx` (fichier entier remplacé)

**Interfaces:**
- Consumes: les 6 cartes des Tasks 3–6.
- Produces: `HomeView(): React.JSX.Element` — inchangé pour le router (`lib/router.tsx` l'importe déjà).

- [ ] **Step 1: Remplacer HomeView.tsx**

Contenu complet du fichier :

```tsx
import { BudgetCard } from '../components/dashboard/BudgetCard'
import { CreditScoreCard } from '../components/dashboard/CreditScoreCard'
import { NetWorthCard } from '../components/dashboard/NetWorthCard'
import { OnboardingCard } from '../components/dashboard/OnboardingCard'
import { RecapCard } from '../components/dashboard/RecapCard'
import { SpendingCard } from '../components/dashboard/SpendingCard'

/** Vue d'ensemble : reproduction du dashboard Origin sur données mockées. */
export function HomeView(): React.JSX.Element {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 p-8 pt-2">
      <div className="flex min-w-0 flex-col gap-6">
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
  )
}
```

Les anciens imports (`AccountsPanel`, `ReportsPanel`, `CashFlowPanel`) disparaissent de ce fichier ; leurs fichiers restent en place (utilisés ailleurs ou réutilisables plus tard).

- [ ] **Step 2: Vérifier typecheck + lint**

Run: `pnpm -C apps/desktop typecheck:web && pnpm -C apps/desktop lint`
Expected: exit 0.

- [ ] **Step 3: Vérification visuelle**

Utiliser la skill `apps/desktop:verify` pour lancer l'app et inspecter la route `/` (Home). Vérifier contre le screenshot de référence :

1. Grille 2 colonnes, colonne droite ~360px.
2. NetWorthCard : "$1,072", chart gris avec encart central, chips 1W/1M/3M/YTD/ALL, bouton pleine largeur "Add account" arrondi.
3. SpendingCard : "$72", calendrier 7 colonnes avec le 12 en bleu ($72), 4 transactions dont deux avec icône œil barré.
4. Colonne droite dans l'ordre : carte verte onboarding (segments 1/3 + "33% complete"), carte "Daily market brief" à bordure dégradée, carte budget (barre lime 0 % + bouton foncé), carte credit score (4 segments + bouton foncé).
5. Aucune erreur console au chargement.

Corriger les écarts visuels éventuels (espacements, tailles) avant de commiter.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/views/HomeView.tsx
git commit -m "feat(renderer): replace HomeView content with Origin dashboard reproduction"
```

Si le Step 3 a nécessité des retouches dans les cartes, les inclure dans ce commit (`git add` des fichiers retouchés) ou dans un commit `fix(renderer): ...` séparé.
