# Origin Spending Overview Reproduction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `SpendingView`'s content with a static, mock-data reproduction of the Origin "Spending → Overview" screen, keeping Fela's existing sidebar and header.

**Architecture:** A rewritten `SpendingView` composes a static tab bar and a two-column grid (`1fr` + fixed `360px`). Six presentational card components under `components/spending-overview/` render from constants in a single `mock-data.ts`. Charts use the existing `ChartContainer` (shadcn wrapper over Recharts 3.8); everything else uses existing `packages/ui` primitives and `lucide-react` icons.

**Tech Stack:** React 19 + TypeScript, TanStack Router (shell only), `@repo/ui` (shadcn/Base UI), Recharts 3.8, lucide-react, Tailwind.

## Global Constraints

- UI imports come from `@repo/ui/components/<name>` (e.g. `@repo/ui/components/card`). Never deep-import Base UI or shadcn source.
- No new `packages/ui` primitives. Reuse `Card`, `Button`, `ToggleGroup`/`ToggleGroupItem`, `ChartContainer`, `Avatar`. Tab bars are styled inline.
- All data is static/mocked. No handlers, no async, no I/O, no live navigation from the reproduced content.
- Icons come exclusively from `lucide-react`. No external assets.
- Section labels use `text-xs font-medium uppercase tracking-widest text-muted-foreground`.
- Desktop-only. Right column fixed at `360px`. No mobile/responsive work.
- There is NO renderer test runner in this repo and no existing chart usage. Per-task verification is: `pnpm lint` and `pnpm checks` both pass. Final visual verification uses the `apps/desktop:verify` skill.
- Component files are `.tsx`, return `React.JSX.Element`, and use function declarations (match `HomeView.tsx` / existing panels).
- Commit after each task with the exact message given.

## File Structure

```
apps/desktop/src/renderer/src/components/spending-overview/
  mock-data.ts                 — types + all mock constants (Task 1)
  SpendingTabs.tsx             — static tab bar (Task 2)
  SpendTrendCard.tsx           — big chart card (Task 3)
  LatestTransactionsCard.tsx   — 5-row transaction list (Task 4)
  UpcomingTransactionsCard.tsx — mini calendar + empty state (Task 5)
  BudgetPromoCard.tsx          — green promo card (Task 6)
  CategoryBreakdownCard.tsx    — donut + category list (Task 7)

apps/desktop/src/renderer/src/views/SpendingView.tsx  — rewritten to compose (Task 8)
```

---

### Task 1: Mock data module

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/mock-data.ts`

**Interfaces:**

- Consumes: `lucide-react` icon components; the `LucideIcon` type.
- Produces:
  - `type SpendPoint = { day: number; february: number; january: number }`
  - `type UpcomingDay = { day: number; muted?: boolean; highlighted?: boolean }`
  - `type LatestTransaction = { name: string; date: string; amount: string; icon: LucideIcon; tone: 'orange' | 'neutral'; hidden?: boolean }`
  - `type ExpenseCategory = { name: string; percent: number; amount: string; icon: LucideIcon; color: string }`
  - `SPEND_SERIES: SpendPoint[]`, `UPCOMING_DAYS: UpcomingDay[]`, `LATEST_TRANSACTIONS: LatestTransaction[]`, `EXPENSE_CATEGORIES: ExpenseCategory[]`

- [ ] **Step 1: Create the mock-data module**

```ts
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Car,
  Gamepad2,
  GraduationCap,
  ShoppingBag,
  Tag,
  Utensils,
} from "lucide-react";

export type SpendPoint = { day: number; february: number; january: number };
export type UpcomingDay = {
  day: number;
  muted?: boolean;
  highlighted?: boolean;
};
export type LatestTransaction = {
  name: string;
  date: string;
  amount: string;
  icon: LucideIcon;
  tone: "orange" | "neutral";
  hidden?: boolean;
};
export type ExpenseCategory = {
  name: string;
  percent: number;
  amount: string;
  icon: LucideIcon;
  color: string;
};

/** Février : plateau bas puis marche montante vers 72. Janvier : comparaison plus haute, en deux paliers. */
export const SPEND_SERIES: SpendPoint[] = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const february = day < 12 ? 6 : 72;
  const january = day < 11 ? 6 : day < 20 ? 96 : 150;
  return { day, february, january };
});

export const UPCOMING_DAYS: UpcomingDay[] = [
  { day: 22, muted: true },
  { day: 23, muted: true },
  { day: 24, muted: true },
  { day: 25, muted: true },
  { day: 26, muted: true },
  { day: 27, highlighted: true },
  { day: 28, muted: true },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
];

export const LATEST_TRANSACTIONS: LatestTransaction[] = [
  {
    name: "Taobao",
    date: "Feb 12",
    amount: "$71.95",
    icon: ShoppingBag,
    tone: "orange",
  },
  {
    name: "To SGD (Added)",
    date: "Feb 12",
    amount: "+$50.00",
    icon: ArrowLeftRight,
    tone: "neutral",
    hidden: true,
  },
  {
    name: "Kraken Exchange",
    date: "Jan 21",
    amount: "$10.00",
    icon: ArrowLeftRight,
    tone: "neutral",
    hidden: true,
  },
  {
    name: "Grab",
    date: "Jan 21",
    amount: "$106.39",
    icon: Car,
    tone: "orange",
  },
  {
    name: "Geo Adventure Indonesia",
    date: "Jan 13",
    amount: "$291.78",
    icon: Tag,
    tone: "neutral",
  },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    name: "Shopping",
    percent: 100,
    amount: "$72",
    icon: ShoppingBag,
    color: "bg-orange-500",
  },
  {
    name: "Drinks & dining",
    percent: 0,
    amount: "$0",
    icon: Utensils,
    color: "bg-yellow-500",
  },
  {
    name: "Childcare & education",
    percent: 0,
    amount: "$0",
    icon: GraduationCap,
    color: "bg-sky-500",
  },
  {
    name: "Auto & transport",
    percent: 0,
    amount: "$0",
    icon: Car,
    color: "bg-rose-400",
  },
  {
    name: "Entertainment",
    percent: 0,
    amount: "$0",
    icon: Gamepad2,
    color: "bg-violet-500",
  },
];
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS (no errors). The module compiles even though nothing imports it yet.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/mock-data.ts
git commit -m "feat(spending): add mock data for Origin spending overview"
```

---

### Task 2: Static tab bar

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/SpendingTabs.tsx`

**Interfaces:**

- Consumes: nothing.
- Produces: `export function SpendingTabs(): React.JSX.Element`

- [ ] **Step 1: Create SpendingTabs**

```tsx
const TABS = [
  "Overview",
  "Breakdown & budget",
  "Transactions",
  "Recurring",
  "Reports",
] as const;

/** Barre d'onglets statique de la page Spending : seul « Overview » est actif (non fonctionnel). */
export function SpendingTabs(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-sm">
      {TABS.map((tab) => {
        const active = tab === "Overview";
        return (
          <span
            key={tab}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-muted px-3 py-1.5 font-medium text-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground"
            }
          >
            {tab}
          </span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/SpendingTabs.tsx
git commit -m "feat(spending): add static spending tab bar"
```

---

### Task 3: Spend trend card (chart)

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/SpendTrendCard.tsx`

**Interfaces:**

- Consumes: `SPEND_SERIES` from `./mock-data`; `Card`, `Button`, `ToggleGroup`/`ToggleGroupItem`, `ChartContainer`, `ChartConfig`.
- Produces: `export function SpendTrendCard(): React.JSX.Element`

- [ ] **Step 1: Create SpendTrendCard**

```tsx
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { type ChartConfig, ChartContainer } from "@repo/ui/components/chart";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import {
  CalendarIcon,
  ChevronDownIcon,
  LineChartIcon,
  SparklesIcon,
} from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";

import { SPEND_SERIES } from "./mock-data";

const chartConfig = {
  february: { label: "February", color: "#3b82f6" },
  january: { label: "vs January", color: "#9ca3af" },
} satisfies ChartConfig;

/** Grande carte « SPEND THIS MONTH » : montant, comparaison, et courbe février vs janvier. */
export function SpendTrendCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Spend this month
        </span>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" defaultValue="line" size="sm">
            <ToggleGroupItem value="line" aria-label="Line view">
              <LineChartIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view">
              <CalendarIcon />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="icon-sm" aria-label="AI insights">
            <SparklesIcon className="text-violet-500" />
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-4xl font-semibold">$72</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-500" />
            February
          </div>
        </div>
        <Button variant="outline" className="rounded-full">
          vs January
          <ChevronDownIcon />
        </Button>
      </div>

      <ChartContainer config={chartConfig} className="aspect-[16/6] w-full">
        <AreaChart data={SPEND_SERIES} margin={{ left: 12, right: 12, top: 8 }}>
          <defs>
            <linearGradient id="fillFebruary" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-february)"
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor="var(--color-february)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            ticks={[1, 8, 15, 22]}
            tickFormatter={(d) => String(d).padStart(2, "0")}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <Area
            dataKey="january"
            type="stepAfter"
            stroke="var(--color-january)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          <Area
            dataKey="february"
            type="stepAfter"
            stroke="var(--color-february)"
            strokeWidth={2}
            fill="url(#fillFebruary)"
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS. If `check-types` complains about a Recharts prop type, confirm the import is from `recharts` (not `@repo/ui`) and that `type` uses a string literal like `"stepAfter"`.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/SpendTrendCard.tsx
git commit -m "feat(spending): add spend trend card with february vs january chart"
```

---

### Task 4: Latest transactions card

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/LatestTransactionsCard.tsx`

**Interfaces:**

- Consumes: `LATEST_TRANSACTIONS` from `./mock-data`; `Card`, `Button`.
- Produces: `export function LatestTransactionsCard(): React.JSX.Element`

- [ ] **Step 1: Create LatestTransactionsCard**

```tsx
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ChevronRightIcon, EyeOffIcon, SparklesIcon } from "lucide-react";

import { LATEST_TRANSACTIONS } from "./mock-data";

/** Carte « LATEST TRANSACTIONS » : 5 lignes de transactions mockées. */
export function LatestTransactionsCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Latest transactions
          <ChevronRightIcon className="size-3" />
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <ul className="flex flex-col">
        {LATEST_TRANSACTIONS.map((tx) => {
          const Icon = tx.icon;
          return (
            <li key={tx.name} className="flex items-center gap-3 py-2">
              <span
                className={
                  tx.tone === "orange"
                    ? "flex size-8 items-center justify-center rounded-md bg-orange-100 text-orange-600"
                    : "flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground"
                }
              >
                <Icon className="size-4" />
              </span>
              <div
                className={
                  tx.hidden ? "flex-1 text-muted-foreground" : "flex-1"
                }
              >
                <div className="text-sm font-medium">{tx.name}</div>
                <div className="text-xs text-muted-foreground">{tx.date}</div>
              </div>
              <div className="flex items-center gap-2">
                {tx.hidden ? (
                  <EyeOffIcon className="size-4 text-muted-foreground" />
                ) : null}
                <span
                  className={
                    tx.hidden
                      ? "text-sm text-muted-foreground"
                      : "text-sm font-medium"
                  }
                >
                  {tx.amount}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/LatestTransactionsCard.tsx
git commit -m "feat(spending): add latest transactions card"
```

---

### Task 5: Upcoming transactions card

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/UpcomingTransactionsCard.tsx`

**Interfaces:**

- Consumes: `UPCOMING_DAYS` from `./mock-data`; `Card`, `Button`.
- Produces: `export function UpcomingTransactionsCard(): React.JSX.Element`

- [ ] **Step 1: Create UpcomingTransactionsCard**

```tsx
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ChevronRightIcon, SparklesIcon } from "lucide-react";

import { UPCOMING_DAYS } from "./mock-data";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Carte « UPCOMING TRANSACTIONS » : mini-calendrier avec empty state superposé. */
export function UpcomingTransactionsCard(): React.JSX.Element {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Upcoming transactions
          <ChevronRightIcon className="size-3" />
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <div className="relative">
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="pb-1 text-[10px] font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {UPCOMING_DAYS.map((cell, i) => (
            <div
              key={i}
              className={
                cell.highlighted
                  ? "flex h-9 items-center justify-center rounded-full bg-muted text-sm font-medium"
                  : cell.muted
                    ? "flex h-9 items-center justify-center text-sm text-muted-foreground/50"
                    : "flex h-9 items-center justify-center text-sm text-muted-foreground"
              }
            >
              {cell.day}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg border bg-background/95 p-3 text-center text-sm text-muted-foreground shadow-sm">
          Add your recurring bills and subscriptions to see what&apos;s coming
          up.
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/UpcomingTransactionsCard.tsx
git commit -m "feat(spending): add upcoming transactions card with empty state"
```

---

### Task 6: Budget promo card

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/BudgetPromoCard.tsx`

**Interfaces:**

- Consumes: `Card`, `Button`.
- Produces: `export function BudgetPromoCard(): React.JSX.Element`

- [ ] **Step 1: Create BudgetPromoCard**

```tsx
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { XIcon } from "lucide-react";

/** Carte promo verte « MORE FROM ORIGIN » / « Build a budget with AI ». */
export function BudgetPromoCard(): React.JSX.Element {
  return (
    <Card className="gap-4 border-0 bg-gradient-to-br from-emerald-700 to-green-900 p-6 text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-white/70">
          More from Origin
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss"
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <XIcon />
        </Button>
      </div>
      <h3 className="font-serif text-2xl">Build a budget with AI</h3>
      <p className="text-sm text-white/80">
        AI Budget Builder creates a smart budget based on your real spending in
        seconds.
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/BudgetPromoCard.tsx
git commit -m "feat(spending): add build-a-budget promo card"
```

---

### Task 7: Category breakdown card (donut)

**Files:**

- Create: `apps/desktop/src/renderer/src/components/spending-overview/CategoryBreakdownCard.tsx`

**Interfaces:**

- Consumes: `EXPENSE_CATEGORIES` from `./mock-data`; `Card`, `Button`, `ChartContainer`.
- Produces: `export function CategoryBreakdownCard(): React.JSX.Element`

- [ ] **Step 1: Create CategoryBreakdownCard**

```tsx
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ChartContainer } from "@repo/ui/components/chart";
import { SparklesIcon } from "lucide-react";
import { Pie, PieChart } from "recharts";

import { EXPENSE_CATEGORIES } from "./mock-data";

const donutData = [{ name: "Shopping", value: 100 }];

/** Carte « CATEGORY BREAKDOWN » : donut du mois + liste des catégories de dépenses. */
export function CategoryBreakdownCard(): React.JSX.Element {
  return (
    <Card className="gap-5 p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Category breakdown
        </span>
        <Button variant="outline" size="icon-sm" aria-label="AI insights">
          <SparklesIcon className="text-violet-500" />
        </Button>
      </div>

      <div className="flex items-center gap-6 border-b text-sm">
        <span className="-mb-px border-b-2 border-foreground pb-2 font-medium text-foreground">
          Expenses
        </span>
        <span className="pb-2 text-muted-foreground">Budget</span>
      </div>

      <div className="relative mx-auto aspect-square w-44">
        <ChartContainer config={{}} className="aspect-square w-full">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              innerRadius={68}
              outerRadius={86}
              startAngle={90}
              endAngle={-270}
              cornerRadius={10}
              fill="#f97316"
              stroke="none"
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-semibold">$72</div>
          <div className="text-xs text-muted-foreground">Spent this month</div>
        </div>
      </div>

      <ul className="flex flex-col">
        {EXPENSE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <li key={cat.name} className="flex items-center gap-3 py-2">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-white ${cat.color}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{cat.name}</div>
                <div className="text-xs text-muted-foreground">
                  {cat.percent}% of expenses
                </div>
              </div>
              <span className="text-sm font-medium">{cat.amount}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS. If `check-types` rejects `config={{}}`, pass an explicit empty `ChartConfig`: `const donutConfig = {} satisfies ChartConfig` and use `config={donutConfig}` (add `type ChartConfig` to the chart import).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/spending-overview/CategoryBreakdownCard.tsx
git commit -m "feat(spending): add category breakdown donut card"
```

---

### Task 8: Compose SpendingView

**Files:**

- Modify: `apps/desktop/src/renderer/src/views/SpendingView.tsx` (full rewrite)

**Interfaces:**

- Consumes: all six components from `../components/spending-overview/*` plus `SpendingTabs`.
- Produces: `export function SpendingView(): React.JSX.Element` (unchanged export signature).

- [ ] **Step 1: Rewrite SpendingView to compose the grid**

Replace the entire contents of `SpendingView.tsx` with:

```tsx
import { BudgetPromoCard } from "../components/spending-overview/BudgetPromoCard";
import { CategoryBreakdownCard } from "../components/spending-overview/CategoryBreakdownCard";
import { LatestTransactionsCard } from "../components/spending-overview/LatestTransactionsCard";
import { SpendTrendCard } from "../components/spending-overview/SpendTrendCard";
import { SpendingTabs } from "../components/spending-overview/SpendingTabs";
import { UpcomingTransactionsCard } from "../components/spending-overview/UpcomingTransactionsCard";

/** Spending : reproduction de l'onglet Overview du dashboard Origin (données mockées). */
export function SpendingView(): React.JSX.Element {
  return (
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
  );
}
```

- [ ] **Step 2: Verify lint and types pass**

Run: `pnpm lint && pnpm checks`
Expected: both PASS. The old `TransactionsPanel` / `CategoriesPanel` / `RulesPanel` files remain on disk but are no longer imported here — confirm no "unused import" or "unresolved module" errors.

- [ ] **Step 3: Visual verification**

Use the `apps/desktop:verify` skill to launch the app, navigate to the **Spending** route, and compare against the reference screenshot. Confirm:

- Static tab bar with **Overview** highlighted.
- Left column: spend trend card (solid blue February + dashed gray January, ticks 01/08/15/22), then latest + upcoming transaction cards side by side.
- Right column (360px): green promo card, then category breakdown donut (orange ring, `$72` centered) with the five-category list.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/views/SpendingView.tsx
git commit -m "feat(spending): compose Origin spending overview in SpendingView"
```

---

## Self-Review Notes

- **Spec coverage:** Tab bar → Task 2. Spend chart (February/January, ticks) → Task 3. Latest transactions (5 rows, hidden/eye-off) → Task 4. Upcoming calendar + empty state → Task 5. Green promo → Task 6. Category breakdown donut + list → Task 7. Grid composition + old-panel removal → Task 8. Mock data (`SPEND_SERIES`, `UPCOMING_DAYS`, `LATEST_TRANSACTIONS`, `EXPENSE_CATEGORIES`) → Task 1. All spec sections mapped.
- **No test runner:** The repo has no renderer test infrastructure and this is pure presentational mock UI; verification is lint + type-check per task and a visual check at the end, per Global Constraints. This is an intentional, codebase-appropriate substitution for unit-test steps.
- **Type consistency:** Type names and constants produced in Task 1 (`SpendPoint`, `UpcomingDay`, `LatestTransaction`, `ExpenseCategory`, and the four `UPPER_CASE` arrays) match every consuming task. Every component exports `Name(): React.JSX.Element` and is imported by that exact name in Task 8.

```

```
