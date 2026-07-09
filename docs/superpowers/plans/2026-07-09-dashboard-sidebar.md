# Dashboard Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la page unique qui empile des `<section>` par un shell dashboard : sidebar fixe à gauche (logo « Fela » + menu Home/Spending/Invest, item Réglages en pied) et zone de contenu pilotée par un routeur.

**Architecture:** On introduit **TanStack Router** (routing code-based, hash history) dans le renderer Electron. `App.tsx` monte un `RouterProvider` ; la route racine rend le shell (sidebar + `<Outlet/>`). Quatre routes (`/`, `/spending`, `/invest`, `/settings`) rendent des vues qui composent les panels existants **sans les modifier**. Une sidebar présentationnelle légère vit dans `packages/ui` ; sa version câblée (`AppSidebar`) vit dans le renderer.

**Tech Stack:** React 19, TanStack Router (nouveau), TanStack Query (existant), Tailwind v4, shadcn/ui porté sur `@base-ui/react`, lucide-react, Electron/electron-vite.

## Global Constraints

- **Renderer sans harnais de test unitaire.** vitest/testing-library ne sont configurés que pour `@repo/api` et `@repo/db`. On **n'ajoute pas** de framework de test au renderer (YAGNI). La vérification de chaque tâche = `pnpm checks` (turbo `check-types`) **plus**, pour les tâches à surface runtime, pilotage de l'app via la skill `apps/desktop:verify`.
- **Toute copie visible passe par `lib/strings.ts`** — aucun texte codé en dur dans les composants (convention du fichier). Libellés menu : `Home`, `Spending`, `Invest` en anglais (demande utilisateur) ; `Réglages` en français.
- **`@base-ui/react`, pas Radix.** Les primitives de `packages/ui` ne dépendent jamais de Radix. La sidebar présentationnelle est en divs/nav simples + `cn`, sans dépendance nouvelle.
- **Tokens de couleur `--sidebar-*`** déjà présents dans `packages/ui/src/styles/globals.css` — les classes utilitaires `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `bg-sidebar-primary`, `text-sidebar-primary-foreground`, `ring-sidebar-ring` sont donc disponibles.
- **Hash history obligatoire** sous Electron (`file://`).
- **Import paths** : dans `packages/ui`, importer via l'alias `@repo/ui/lib/utils` (voir les composants existants). Dans le renderer, chemins relatifs (`../../lib/...`) comme les panels existants.
- **Type de retour des composants** : `React.JSX.Element` (convention du renderer).
- **Convention `data-slot`** sur les primitives `packages/ui` (voir `button.tsx`, `empty.tsx`).
- **Commits fréquents**, un par tâche minimum, préfixes `feat`/`refactor` conventionnels.

---

## File Structure

**Créés :**

- `packages/ui/src/components/sidebar.tsx` — primitives présentationnelles (conteneurs + variantes du nav item).
- `apps/desktop/src/renderer/src/components/layout/FelaLogo.tsx` — logo (icône `Wallet` + wordmark).
- `apps/desktop/src/renderer/src/components/layout/AppSidebar.tsx` — sidebar câblée au routeur.
- `apps/desktop/src/renderer/src/views/HomeView.tsx` — Accounts + Reports + CashFlow.
- `apps/desktop/src/renderer/src/views/SpendingView.tsx` — Transactions + Categories + Rules.
- `apps/desktop/src/renderer/src/views/InvestView.tsx` — placeholder `Empty`.
- `apps/desktop/src/renderer/src/views/SettingsView.tsx` — Backups + Export.
- `apps/desktop/src/renderer/src/lib/router.tsx` — arbre de routes + `createRouter` + hash history + shell racine.

**Modifiés :**

- `apps/desktop/package.json` — ajout de `@tanstack/react-router`.
- `apps/desktop/src/renderer/src/App.tsx` — devient l'hôte du `RouterProvider`.
- `apps/desktop/src/renderer/src/lib/strings.ts` — blocs `nav` et `invest`.
- `apps/desktop/src/renderer/src/lib/navigation.ts` — `useNavigateToSection` + mapping section→route.
- `apps/desktop/src/renderer/src/assets/main.css` — retrait du centrage `body`/`#root`.
- `apps/desktop/src/renderer/src/components/transactions/TransactionsPanel.tsx` — CTA passent au helper cross-view.
- `apps/desktop/src/renderer/src/components/reports/ReportsPanel.tsx` — idem.
- `apps/desktop/src/renderer/src/components/reports/CashFlowPanel.tsx` — idem.

---

## Task 1: Primitives Sidebar dans `packages/ui`

**Files:**

- Create: `packages/ui/src/components/sidebar.tsx`

**Interfaces:**

- Consumes: `cn` depuis `@repo/ui/lib/utils` ; `cva`/`VariantProps` depuis `class-variance-authority` (déjà dépendance de `@repo/ui`, voir `button.tsx`).
- Produces (utilisés par la Task 4) :
  - `Sidebar(props: React.ComponentProps<"aside">): JSX.Element`
  - `SidebarHeader(props: React.ComponentProps<"div">): JSX.Element`
  - `SidebarContent(props: React.ComponentProps<"div">): JSX.Element`
  - `SidebarFooter(props: React.ComponentProps<"div">): JSX.Element`
  - `SidebarNav(props: React.ComponentProps<"nav">): JSX.Element`
  - `sidebarNavItemVariants({ active?: boolean }): string` (cva ; variante `active` booléenne, défaut `false`).

- [ ] **Step 1: Écrire `sidebar.tsx`**

Fichier complet `packages/ui/src/components/sidebar.tsx` :

```tsx
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@repo/ui/lib/utils";

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex items-center gap-2 px-4 py-4", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex-1 overflow-y-auto px-3 py-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-sidebar-border px-3 py-3", className)}
      {...props}
    />
  );
}

function SidebarNav({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="sidebar-nav"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

const sidebarNavItemVariants = cva(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      active: {
        true: "bg-sidebar-primary text-sidebar-primary-foreground",
        false:
          "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarNav,
  sidebarNavItemVariants,
};
export type SidebarNavItemVariants = VariantProps<
  typeof sidebarNavItemVariants
>;
```

- [ ] **Step 2: Vérifier le type-check du package UI**

Run: `pnpm --filter @repo/ui check-types`
Expected: PASS (aucune erreur `tsc`).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/sidebar.tsx
git commit -m "feat(ui): add lightweight sidebar presentational primitives"
```

---

## Task 2: Vues qui composent les panels existants + strings

**Files:**

- Create: `apps/desktop/src/renderer/src/views/HomeView.tsx`
- Create: `apps/desktop/src/renderer/src/views/SpendingView.tsx`
- Create: `apps/desktop/src/renderer/src/views/InvestView.tsx`
- Create: `apps/desktop/src/renderer/src/views/SettingsView.tsx`
- Modify: `apps/desktop/src/renderer/src/lib/strings.ts`

**Interfaces:**

- Consumes: panels existants (`AccountsPanel`, `ReportsPanel`, `CashFlowPanel`, `TransactionsPanel`, `CategoriesPanel`, `RulesPanel`, `BackupsPanel`, `ExportPanel`) ; primitives `Empty*` de `@repo/ui/components/empty` ; `strings` de `../lib/strings`.
- Produces (utilisés par la Task 3) : `HomeView`, `SpendingView`, `InvestView`, `SettingsView` — chacune `(): React.JSX.Element`. Bloc `strings.nav` et `strings.invest`.

- [ ] **Step 1: Ajouter les blocs `nav` et `invest` à `strings.ts`**

Dans `apps/desktop/src/renderer/src/lib/strings.ts`, à l'intérieur de l'objet `strings`, juste après le bloc `app: { ... },` (ligne ~10-14), insérer :

```ts
  nav: {
    home: 'Home',
    spending: 'Spending',
    invest: 'Invest',
    settings: 'Réglages'
  },
  invest: {
    title: 'Bientôt disponible',
    description: "Le suivi de vos investissements arrive dans une prochaine version."
  },
```

- [ ] **Step 2: Écrire `HomeView.tsx`**

`apps/desktop/src/renderer/src/views/HomeView.tsx` :

```tsx
import { AccountsPanel } from "../components/accounts/AccountsPanel";
import { CashFlowPanel } from "../components/reports/CashFlowPanel";
import { ReportsPanel } from "../components/reports/ReportsPanel";

/** Vue d'ensemble : comptes, rapports et flux de trésorerie. */
export function HomeView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <AccountsPanel />
      <ReportsPanel />
      <CashFlowPanel />
    </div>
  );
}
```

- [ ] **Step 3: Écrire `SpendingView.tsx`**

`apps/desktop/src/renderer/src/views/SpendingView.tsx` :

```tsx
import { CategoriesPanel } from "../components/categories/CategoriesPanel";
import { RulesPanel } from "../components/rules/RulesPanel";
import { TransactionsPanel } from "../components/transactions/TransactionsPanel";

/** Dépenses : transactions, catégories et règles de catégorisation. */
export function SpendingView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <TransactionsPanel />
      <CategoriesPanel />
      <RulesPanel />
    </div>
  );
}
```

- [ ] **Step 4: Écrire `SettingsView.tsx`**

`apps/desktop/src/renderer/src/views/SettingsView.tsx` :

```tsx
import { BackupsPanel } from "../components/backups/BackupsPanel";
import { ExportPanel } from "../components/exports/ExportPanel";

/** Réglages : sauvegardes et export des données. */
export function SettingsView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <BackupsPanel />
      <ExportPanel />
    </div>
  );
}
```

- [ ] **Step 5: Écrire `InvestView.tsx`**

`apps/desktop/src/renderer/src/views/InvestView.tsx` :

```tsx
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { TrendingUpIcon } from "lucide-react";

import { strings } from "../lib/strings";

const t = strings.invest;

/** Placeholder de la future vue Investissements. */
export function InvestView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUpIcon />
          </EmptyMedia>
          <EmptyTitle>{t.title}</EmptyTitle>
          <EmptyDescription>{t.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
```

> Note : `EmptyMedia variant="icon"` est l'API en place (voir `empty.tsx` et son usage dans `AccountsPanel.tsx`).

- [ ] **Step 6: Vérifier le type-check**

Run: `pnpm --filter desktop typecheck:web`
Expected: PASS. (Les vues compilent indépendamment du routeur, qui n'existe pas encore.)

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src/views apps/desktop/src/renderer/src/lib/strings.ts
git commit -m "feat(renderer): add per-route views composing existing panels"
```

---

## Task 3: Routeur, shell, sidebar câblée, logo — montage du dashboard

**Files:**

- Modify: `apps/desktop/package.json` (dépendance)
- Create: `apps/desktop/src/renderer/src/components/layout/FelaLogo.tsx`
- Create: `apps/desktop/src/renderer/src/components/layout/AppSidebar.tsx`
- Create: `apps/desktop/src/renderer/src/lib/router.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`
- Modify: `apps/desktop/src/renderer/src/assets/main.css`

**Interfaces:**

- Consumes: primitives de la Task 1 (`Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarNav`, `sidebarNavItemVariants`) ; vues de la Task 2 ; `strings.nav` ; `Link`, `useLocation`, `createRootRoute`, `createRoute`, `createRouter`, `createHashHistory`, `RouterProvider`, `Outlet` de `@tanstack/react-router`.
- Produces (utilisés par la Task 4) : `export const router` depuis `lib/router.tsx`, avec les routes `/`, `/spending`, `/invest`, `/settings`.

- [ ] **Step 1: Installer TanStack Router**

Run: `pnpm --filter desktop add @tanstack/react-router`
Expected: `@tanstack/react-router` apparaît dans `dependencies` de `apps/desktop/package.json` ; installation sans erreur.

- [ ] **Step 2: Écrire `FelaLogo.tsx`**

`apps/desktop/src/renderer/src/components/layout/FelaLogo.tsx` :

```tsx
import { WalletIcon } from "lucide-react";

import { strings } from "../../lib/strings";

/** Logo provisoire : icône + wordmark « Fela ». Remplaçable par un asset. */
export function FelaLogo(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <WalletIcon className="size-4" />
      </span>
      <span className="text-base font-semibold tracking-tight">
        {strings.app.name}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Écrire `AppSidebar.tsx`**

`apps/desktop/src/renderer/src/components/layout/AppSidebar.tsx` :

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  sidebarNavItemVariants,
} from "@repo/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  SettingsIcon,
  TrendingUpIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import { strings } from "../../lib/strings";
import { FelaLogo } from "./FelaLogo";

type NavEntry = { to: string; label: string; icon: LucideIcon };

const MAIN_NAV: NavEntry[] = [
  { to: "/", label: strings.nav.home, icon: HomeIcon },
  { to: "/spending", label: strings.nav.spending, icon: WalletCardsIcon },
  { to: "/invest", label: strings.nav.invest, icon: TrendingUpIcon },
];

const SETTINGS_NAV: NavEntry = {
  to: "/settings",
  label: strings.nav.settings,
  icon: SettingsIcon,
};

function NavLink({
  entry,
  active,
}: {
  entry: NavEntry;
  active: boolean;
}): React.JSX.Element {
  const Icon = entry.icon;
  return (
    <Link to={entry.to} className={sidebarNavItemVariants({ active })}>
      <Icon />
      <span>{entry.label}</span>
    </Link>
  );
}

/** Sidebar de l'app : logo, menu principal, item Réglages en pied. */
export function AppSidebar(): React.JSX.Element {
  const { pathname } = useLocation();
  return (
    <Sidebar>
      <SidebarHeader>
        <FelaLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav>
          {MAIN_NAV.map((entry) => (
            <NavLink
              key={entry.to}
              entry={entry}
              active={pathname === entry.to}
            />
          ))}
        </SidebarNav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarNav>
          <NavLink entry={SETTINGS_NAV} active={pathname === SETTINGS_NAV.to} />
        </SidebarNav>
      </SidebarFooter>
    </Sidebar>
  );
}
```

> Note : `useLocation()` renvoie l'objet location courant ; `pathname` en est extrait. Comparaison exacte suffisante ici (routes plates, pas d'enfants).

- [ ] **Step 4: Écrire `router.tsx` (arbre de routes + shell racine)**

`apps/desktop/src/renderer/src/lib/router.tsx` :

```tsx
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";

import { AppSidebar } from "../components/layout/AppSidebar";
import { HomeView } from "../views/HomeView";
import { InvestView } from "../views/InvestView";
import { SettingsView } from "../views/SettingsView";
import { SpendingView } from "../views/SpendingView";

/** Shell du dashboard : sidebar fixe + zone de contenu scrollable. */
function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeView,
});

const spendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spending",
  component: SpendingView,
});

const investRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invest",
  component: InvestView,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsView,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  spendingRoute,
  investRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 5: Câbler `App.tsx` au routeur**

Remplacer **tout** le contenu de `apps/desktop/src/renderer/src/App.tsx` par :

```tsx
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./lib/router";

function App(): React.JSX.Element {
  return <RouterProvider router={router} />;
}

export default App;
```

- [ ] **Step 6: Neutraliser le centrage du template Electron dans `main.css`**

Dans `apps/desktop/src/renderer/src/assets/main.css`, remplacer la règle `body { … }` (celle qui contient `display: flex; align-items: center; justify-content: center;`) par :

```css
body {
  background-size: cover;
  user-select: none;
}
```

Puis remplacer la règle `#root { … }` par :

```css
#root {
  height: 100vh;
}
```

(Laisser les autres règles `.logo`, `.text`, etc. intactes : inutilisées mais inoffensives.)

- [ ] **Step 7: Vérifier le type-check global**

Run: `pnpm checks`
Expected: PASS pour tous les packages, y compris `desktop`.

- [ ] **Step 8: Piloter l'app pour vérifier le shell**

Utiliser la skill `apps/desktop:verify` pour lancer l'app et observer :

- sidebar visible à gauche avec le logo « Fela » (icône + texte) dans le header ;
- menu Home / Spending / Invest ; Réglages en pied ;
- au démarrage, route `/` → Home affiche Accounts + Reports + CashFlow ;
- clic sur **Spending** → Transactions + Categories + Rules ; clic sur **Invest** → placeholder « Bientôt disponible » ; clic sur **Réglages** → Backups + Export ;
- l'item de la vue courante est surligné ;
- recharger la fenêtre conserve la vue (hash).

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/package.json pnpm-lock.yaml \
  apps/desktop/src/renderer/src/components/layout \
  apps/desktop/src/renderer/src/lib/router.tsx \
  apps/desktop/src/renderer/src/App.tsx \
  apps/desktop/src/renderer/src/assets/main.css
git commit -m "feat(renderer): dashboard shell with TanStack Router sidebar navigation"
```

---

## Task 4: Navigation cross-view pour les CTA d'onboarding

**Files:**

- Modify: `apps/desktop/src/renderer/src/lib/navigation.ts`
- Modify: `apps/desktop/src/renderer/src/components/transactions/TransactionsPanel.tsx`
- Modify: `apps/desktop/src/renderer/src/components/reports/ReportsPanel.tsx`
- Modify: `apps/desktop/src/renderer/src/components/reports/CashFlowPanel.tsx`

**Contexte :** les CTA d'empty-state appellent aujourd'hui `scrollToSection(SECTIONS.x)`. Après découpage, les sections cibles vivent sur des vues différentes : `accounts` et `reports` sur `/`, `transactions` sur `/spending`. Un scroll seul échoue si la section n'est pas montée. On introduit `useNavigateToSection` qui navigue vers la bonne route **puis** scrolle.

Callers concernés (relevés dans le code) :

- `TransactionsPanel.tsx` (vue `/spending`) : `scrollToSection(SECTIONS.reports)` → `/` ; `scrollToSection(SECTIONS.accounts)` → `/`.
- `ReportsPanel.tsx` (vue `/`) : `scrollToSection(SECTIONS.transactions)` → `/spending`.
- `CashFlowPanel.tsx` (vue `/`) : `scrollToSection(SECTIONS.transactions)` → `/spending`.

**Interfaces:**

- Consumes: `useRouter` de `@tanstack/react-router` ; `SECTIONS`, `scrollToSection` existants.
- Produces (utilisés par les panels) : `useNavigateToSection(): (sectionId: string) => void`.

- [ ] **Step 1: Étendre `navigation.ts`**

Dans `apps/desktop/src/renderer/src/lib/navigation.ts`, **conserver** `SECTIONS` et `scrollToSection` tels quels, et ajouter en tête l'import et en fin de fichier le mapping + le hook :

En haut du fichier (après le commentaire de doc, avant `export const SECTIONS`) :

```ts
import { useRouter } from "@tanstack/react-router";
```

À la fin du fichier :

```ts
/**
 * Chaque section vit désormais sur une route : « accounts » et « reports » sur
 * Home, « transactions » sur Spending. Un CTA d'empty-state doit donc changer de
 * vue avant de pouvoir scroller vers sa cible.
 */
const SECTION_ROUTE: Record<string, string> = {
  [SECTIONS.accounts]: "/",
  [SECTIONS.reports]: "/",
  [SECTIONS.transactions]: "/spending",
};

/**
 * Renvoie un callback qui amène l'utilisateur à une section : il navigue vers la
 * route qui l'héberge (si on n'y est pas déjà) puis scrolle une fois la section
 * montée. Sur la même route, il scrolle directement.
 */
export function useNavigateToSection(): (sectionId: string) => void {
  const router = useRouter();
  return (sectionId: string): void => {
    const to = SECTION_ROUTE[sectionId] ?? "/";
    if (router.state.location.pathname === to) {
      scrollToSection(sectionId);
      return;
    }
    void router.navigate({ to }).then(() => {
      // Attendre le montage de la nouvelle vue avant de scroller (deux frames
      // pour laisser React peindre le contenu de la route).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToSection(sectionId));
      });
    });
  };
}
```

- [ ] **Step 2: Mettre à jour `TransactionsPanel.tsx`**

Remplacer l'import (ligne ~43) :

```ts
import { SECTIONS, scrollToSection } from "../../lib/navigation";
```

par :

```ts
import { SECTIONS, useNavigateToSection } from "../../lib/navigation";
```

Dans le corps du composant, après les autres hooks (près du haut de la fonction du panel), ajouter :

```ts
const navigateToSection = useNavigateToSection();
```

Puis remplacer les deux appels :

- `onClick={() => scrollToSection(SECTIONS.reports)}` → `onClick={() => navigateToSection(SECTIONS.reports)}`
- `onClick={() => scrollToSection(SECTIONS.accounts)}` → `onClick={() => navigateToSection(SECTIONS.accounts)}`

(Le `<section id={SECTIONS.transactions}>` reste inchangé.)

- [ ] **Step 3: Mettre à jour `ReportsPanel.tsx`**

Remplacer l'import (ligne ~24) :

```ts
import { SECTIONS, scrollToSection } from "../../lib/navigation";
```

par :

```ts
import { SECTIONS, useNavigateToSection } from "../../lib/navigation";
```

Dans le corps du composant, après les autres hooks, ajouter :

```ts
const navigateToSection = useNavigateToSection();
```

Puis remplacer :

- `onClick={() => scrollToSection(SECTIONS.transactions)}` → `onClick={() => navigateToSection(SECTIONS.transactions)}`

(Le `<section id={SECTIONS.reports}>` reste inchangé.)

- [ ] **Step 4: Mettre à jour `CashFlowPanel.tsx`**

Remplacer l'import (ligne ~18) :

```ts
import { SECTIONS, scrollToSection } from "../../lib/navigation";
```

par :

```ts
import { SECTIONS, useNavigateToSection } from "../../lib/navigation";
```

Dans le corps du composant, après les autres hooks, ajouter :

```ts
const navigateToSection = useNavigateToSection();
```

Puis remplacer :

- `onClick={() => scrollToSection(SECTIONS.transactions)}` → `onClick={() => navigateToSection(SECTIONS.transactions)}`

- [ ] **Step 5: Vérifier le type-check global**

Run: `pnpm checks`
Expected: PASS. (Si `scrollToSection` n'est plus importé nulle part hors `navigation.ts`, aucune erreur d'unused — il reste exporté et utilisé en interne.)

- [ ] **Step 6: Piloter l'app pour vérifier le cross-view**

Via `apps/desktop:verify`, avec une base vide ou de démo :

- depuis Home, le CTA de Reports/CashFlow « voir les transactions » **navigue vers Spending** puis scrolle jusqu'à la section transactions ;
- depuis Spending, le CTA de Transactions « … comptes/rapport » **navigue vers Home** puis scrolle jusqu'à la bonne section ;
- l'item de menu actif suit le changement de route.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src/lib/navigation.ts \
  apps/desktop/src/renderer/src/components/transactions/TransactionsPanel.tsx \
  apps/desktop/src/renderer/src/components/reports/ReportsPanel.tsx \
  apps/desktop/src/renderer/src/components/reports/CashFlowPanel.tsx
git commit -m "feat(renderer): cross-view navigation for onboarding CTAs"
```

---

## Notes de vérification finale (definition of done)

- `pnpm checks` vert sur tout le workspace.
- App pilotée via `apps/desktop:verify` : sidebar + logo, 3 items + Réglages, changement de vue, item actif surligné, placeholder Invest, CTA cross-view fonctionnels, persistance de la vue au reload.
- Hors périmètre (rappel) : sidebar repliable/mobile, contenu réel d'Invest, refonte des panels, i18n.
