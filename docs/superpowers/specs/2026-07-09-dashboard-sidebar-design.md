# Design — Dashboard shell avec sidebar

**Date:** 2026-07-09
**Statut:** Approuvé (brainstorming)
**Périmètre:** Première étape d'une refonte de l'interface en « vrai dashboard » — introduire un shell applicatif avec une sidebar de navigation.

## Objectif

Remplacer la page unique qui empile des `<section>` par un shell dashboard :
une sidebar fixe à gauche (logo + menu) et une zone de contenu principale
pilotée par un routeur. Le menu principal expose **Home**, **Spending**,
**Invest** ; un item **Réglages** vit dans le pied de la sidebar.

## État actuel (contexte)

- App **Electron** (renderer React 19 + electron-vite/Vite), monorepo Turborepo/pnpm.
- **Aucun routeur** : `App.tsx` empile 8 panels dans un `<main>` centré.
  Navigation actuelle = `scrollToSection(id)` (`lib/navigation.ts`), utilisée
  par les CTA d'empty-state de l'onboarding (issue #17).
- Panels existants : `AccountsPanel`, `ReportsPanel`, `CashFlowPanel`,
  `TransactionsPanel`, `CategoriesPanel`, `RulesPanel`, `BackupsPanel`,
  `ExportPanel`.
- `packages/ui` = shadcn/ui **porté sur `@base-ui/react`** (pas Radix),
  Tailwind v4. **Pas** de composant `sidebar`. Les tokens `--sidebar-*`
  existent déjà dans `globals.css` (clair + sombre).
- `@tanstack/react-query` est installé ; **`@tanstack/react-router` ne l'est pas**.
- Pas de logo de marque (seulement le logo template Electron, inutilisé).

## Décisions (issues du brainstorming)

1. **Navigation** : vraies vues séparées via un mini-routeur — **TanStack Router**.
2. **Répartition du contenu** :
   - Home = Accounts + Reports + CashFlow (vue d'ensemble)
   - Spending = Transactions + Categories + Rules
   - Invest = placeholder vide (à construire plus tard)
   - Réglages = Backups + Export
3. **Sidebar** : composant **léger sur-mesure** (pas le port complet du sidebar
   shadcn — ni collapsible, ni rail, ni drawer mobile, ni persistance cookie).
4. **Logo** : wordmark « Fela » + icône lucide (`Wallet`) provisoire.
5. **Réglages** : item distinct dans le **footer** de la sidebar.

## Architecture

### Routeur

- Ajouter `@tanstack/react-router` au renderer (`apps/desktop`).
- **Routing code-based** (rootRoute + routes enfants définies en TS), **sans**
  plugin de codegen — 4 routes seulement.
- **Hash history** (`createHashHistory`) : obligatoire sous Electron `file://`
  et robuste au reload.
- `main.tsx` : `RouterProvider` **à l'intérieur** du `QueryClientProvider`
  existant (les panels consomment React Query). Le `<Toaster/>` reste au niveau
  racine.

Routes :

| Route       | Item menu         | Vue            | Contenu                           |
| ----------- | ----------------- | -------------- | --------------------------------- |
| `/`         | Home              | `HomeView`     | Accounts + Reports + CashFlow     |
| `/spending` | Spending          | `SpendingView` | Transactions + Categories + Rules |
| `/invest`   | Invest            | `InvestView`   | Placeholder `Empty` (« bientôt ») |
| `/settings` | Réglages (footer) | `SettingsView` | Backups + Export                  |

### Shell (`App.tsx`)

- Devient un layout **flex row pleine hauteur** : `<AppSidebar/>` fixe à gauche
  - région de contenu scrollable rendant `<Outlet/>`.
- Le `<main>` centré actuel disparaît ; chaque vue conserve le
  `flex flex-col gap-6 p-8` pour son contenu.
- **Neutraliser** le centrage hérité du template Electron dans
  `assets/main.css` / `assets/base.css` (`#root`/`body`
  `display:flex; align-items:center; justify-content:center`) pour que le shell
  remplisse la fenêtre.

### Composant Sidebar — `packages/ui`

Primitives **présentation uniquement**, branchées sur les tokens `--sidebar-*` :

- `Sidebar` — conteneur (largeur fixe, `bg-sidebar text-sidebar-foreground`,
  bordure droite, pleine hauteur, flex column).
- `SidebarHeader` — zone haute (accueille le logo).
- `SidebarContent` — zone médiane extensible (`flex-1`), accueille la nav.
- `SidebarFooter` — zone basse (accueille l'item Réglages).
- `SidebarNav` / `SidebarNavItem` — liste de nav + item cliquable avec état
  `active` (styles `--sidebar-accent` / `--sidebar-primary`), slot icône + label.

Ces primitives ne connaissent **ni le routeur ni les items** : purement visuelles
et réutilisables (convention shadcn).

### `AppSidebar` — renderer (spécifique app)

- Câble les items de menu aux **liens TanStack Router** (`Link` / `navigate`).
- Détermine l'item actif via `useLocation`/`useMatchRoute`.
- Rend `FelaLogo` dans `SidebarHeader`, le menu principal dans `SidebarContent`,
  l'item Réglages dans `SidebarFooter`.
- Chaînes FR issues de `lib/strings` (ajouter les libellés de nav).

### `FelaLogo` — renderer

- Icône lucide `Wallet` + wordmark « Fela » (`strings.app.name`). Composant
  isolé, remplaçable par un asset plus tard.

### Vues — renderer

- `HomeView`, `SpendingView`, `SettingsView` : composent les panels existants
  **sans les modifier** (juste réagencés par vue).
- `InvestView` : état vide via le composant `Empty` de `@repo/ui` + libellé FR.

## Onboarding / navigation cross-view (point sensible)

Les CTA d'empty-state appellent `scrollToSection(id)` vers `accounts`,
`reports`, `transactions`. Après découpage, ces sections vivent sur des vues
différentes (`transactions` → `/spending`). Un simple scroll échouerait si la
section n'est pas montée.

**Solution** : étendre `lib/navigation.ts` avec
`navigateToSection(router, sectionId)` qui :

1. mappe `sectionId` → route (`accounts`/`reports` → `/`, `transactions` → `/spending`),
2. `router.navigate(...)` vers cette route,
3. **puis** scrolle vers la section (après montage — via l'API de navigation
   du router, p. ex. dans le `.then()`/effet post-navigation).

Les ids `SECTIONS` restent posés sur les `<section>`. Les appelants existants
(CTA) passent au nouveau helper.

## Découpage en fichiers

- `packages/ui/src/components/sidebar.tsx` — primitives présentation.
- `apps/desktop/.../components/layout/AppSidebar.tsx` — sidebar câblée.
- `apps/desktop/.../components/layout/FelaLogo.tsx` — logo.
- `apps/desktop/.../views/HomeView.tsx`, `SpendingView.tsx`, `InvestView.tsx`,
  `SettingsView.tsx` — composition des panels par vue.
- `apps/desktop/.../lib/router.tsx` (ou `router.ts`) — définition des routes +
  `createRouter` + hash history.
- `App.tsx` — shell (sidebar + Outlet).
- `main.tsx` — `RouterProvider`.
- `lib/navigation.ts` — `navigateToSection` + mapping section→route.
- `lib/strings.ts` — libellés de nav (Home/Spending/Invest/Réglages).
- `assets/main.css` / `base.css` — retrait du centrage.

## Vérification (definition of done)

- `pnpm checks` (check-types) passe sur tout le workspace.
- Lancement de l'app (skill `apps/desktop:verify`) et observation :
  - sidebar visible à gauche, logo « Fela » + icône dans le header ;
  - le menu montre Home / Spending / Invest, Réglages en pied ;
  - cliquer chaque item **change la vue** et affiche les bons panels ;
  - l'item de la vue courante est **surligné** (état actif) ;
  - `/invest` affiche le placeholder ;
  - un CTA d'empty-state (ex. « importez » → transactions) **navigue vers la
    vue puis scrolle** vers la bonne section (cross-view) ;
  - reload (hash) restaure la vue courante.

## Hors périmètre (YAGNI)

- Sidebar repliable / responsive mobile / raccourci clavier / persistance cookie.
- Vrai contenu de la vue Invest.
- Refonte visuelle des panels eux-mêmes.
- Déplacement/refonte de l'onboarding au-delà du helper cross-view.
