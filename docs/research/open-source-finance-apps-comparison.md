# Comparatif d'applications open-source de finances personnelles : Grisbi, GnuCash, KMyMoney

## Introduction

Ce document compare trois applications open-source établies de gestion de finances personnelles — **Grisbi**, **GnuCash** et **KMyMoney** — afin d'éclairer le développement de **fela**, une application web moderne de finances personnelles (ce dépôt est le monorepo de fela).

- **Date de la recherche :** 2026-07-08
- **Méthode :** chaque affirmation a été vérifiée autant que possible contre une **source primaire** (site officiel, manuel/documentation officielle, dépôt de code, notes de version). Les points non confirmables à partir d'une source primaire sont explicitement marqués _(non confirmé)_.
- **Axe d'analyse :** couverture fonctionnelle, philosophie du modèle de données (comptabilité en partie simple vs partie double), import/synchronisation, reporting, budget, catégorisation, multi-devises, investissements, plateformes et approche UX.

> Note de lecture : les sources sont citées en ligne (ex. « source : gnucash.org/features ») et rassemblées dans la section **Sources** en fin de document.

---

## 1. Grisbi

### Vue d'ensemble

Grisbi est un gestionnaire de finances personnelles français, écrit en C avec GTK, existant depuis avril 2000 (source : grisbi.org — « Grisbi has existed for almost 21 years, with the first version published in April 2000 »). Il se présente comme « Accounting for everyone! » et vise la simplicité d'usage pour les particuliers et les petites associations (source : grisbi.org).

Point de philosophie de données clé : Grisbi utilise une **comptabilité en partie simple** (« Simple entry accounting », source : en.grisbi.org/post/2013/01/26/Features). C'est la différence structurante avec GnuCash et KMyMoney, qui sont en partie double.

### Licence

GNU GPL v2 (source : github.com/grisbi/grisbi ; sourceforge.net/projects/grisbi — « released under the GNU GPL v2 license »).

### Plateformes

Application **desktop** : Linux (GTK), Windows (portage), macOS (source : grisbi.org « Multi-platforms » ; sourceforge.net/projects/grisbi). Pas d'application mobile officielle _(aucune mention sur les sources primaires — considéré comme absent)_.

### Dernière version / maintenance

La page d'accueil annonce la version **3.90.1** disponible au **31 décembre 2025**, téléchargeable via SourceForge (source : grisbi.org). Le développement se fait sur GitHub (github.com/grisbi/grisbi). Les numéros 3.90.x correspondent typiquement à une série de développement/pré-version _(interprétation non confirmée par une note de version officielle)_ ; le projet reste actif fin 2025.

### Fonctionnalités (relevé)

- **Comptabilité en partie simple** (source : en.grisbi.org/.../Features).
- **Types de comptes** : comptes bancaires et de caisse, comptes de passif (liability), comptes d'actif (asset), avec soldes affichés séparément (source : manuel Grisbi, grisbi-manuel-en005).
- **Catégories et sous-catégories**, gérables et importables/exportables au format `.csgb` (source : manuel en005).
- **Lignes budgétaires** (« Budgetary lines »), exercices financiers, estimations budgétaires, gestion de cartes bancaires — présentées comme adaptées aux associations (source : manuel Grisbi / grisbi.org).
- **Tiers/Payees** : création, édition, gestion, suppression des tiers inutilisés (source : manuel en005).
- **Multi-devises** : soldes affichés par devise pour chaque compte et groupe de comptes (source : grisbi.org « Multi-currencies » ; manuel en005).
- **Rapprochement (réconciliation)** : fonction « Show reconciles », marquage/retrait de transactions rapprochées (raccourcis Ctrl+P / Ctrl+R) (source : manuel en005).
- **Échéancier (scheduled transactions)** : onglet « Scheduler » ; à l'import, fusion possible des échéances avec les entrées importées (source : manuel en005/en006).
- **Rapports** : fonction de rapports décrite comme puissante, groupables par tiers, catégorie, etc. (source : grisbi.org ; manuel en005).
- **Import** : formats **Gnucash, OFX, CSV, QIF** (source : manuel en006 — « Grisbi currently supports Gnucash, OFX, CSV and QIF personal accounting data formats »). Assistant d'import en 5 étapes ; **règles d'import rapide** possibles pour QIF/OFX ; association caractères→tiers (source : en006).
- **Export** : QIF et CSV (par compte ; conversion en devise du compte car QIF/CSV ne gèrent pas la devise) (source : manuel en006).
- **Simulateur de crédits** (« Credits simulator ») (source : manuel en005).
- **Format de fichier** : XML propriétaire Grisbi `.gsb` _(extension non revérifiée sur source primaire dans cette session — largement documentée par ailleurs ; marquée comme probable)_.
- **Banque en ligne (HBCI / OFX Direct Connect)** : **absente** — aucune mention de connexion bancaire directe dans la documentation d'import (source : manuel en006, qui ne décrit que l'import de fichiers).
- **Investissements / titres** : pas de suivi de portefeuille de titres mis en avant _(non confirmé comme présent ; considéré absent)_.
- **Chiffrement** : Grisbi a historiquement proposé un chiffrement de fichier par mot de passe _(non confirmé pour la version courante)_.

---

## 2. GnuCash

### Vue d'ensemble

GnuCash est un logiciel de comptabilité personnelle **et** de petite entreprise, reconnu pour son moteur de **comptabilité en partie double** de niveau professionnel (source : gnucash.org/features.phtml — « Every transaction must debit one account and credit others by an equal amount »). Il propose une saisie « checkbook-style register » familière tout en garantissant l'équilibre des comptes (source : gnucash.org/features).

Philosophie de données : **partie double** stricte. Chaque transaction équilibre débit et crédit ; les catégories de revenus/dépenses sont elles-mêmes des comptes, ce qui permet des états comme le compte de résultat (Profit & Loss) qu'un système « plain-vanilla » ne peut produire (source : gnucash.org/features).

### Licence

GNU General Public License (GPL) (source : gnucash.org — « released under the GNU General Public License (GPL) »).

### Plateformes

GNU/Linux, \*BSD, Solaris, macOS et Microsoft Windows (source : gnucash.org ; gnucash.org/features — « Windows, MacOS, Linux »). **Desktop uniquement.**

### Dernière version / maintenance

Série stable **5.x** très active : GnuCash **5.13** publié le 2025-09-28, **5.14** en décembre 2025, jusqu'à **5.16** (source : lists.gnucash.org/pipermail/gnucash-announce ; github.com/Gnucash/gnucash/releases). Projet mûr et activement maintenu. Traduit en **61 langues** (source : gnucash.org/features).

### Mobile

Pas d'application mobile officielle. Il existe des applications compagnons tierces (« GnuCash Mobile » Android/iOS, ou l'ancienne « GnuCash for Android ») permettant de saisir des transactions en déplacement puis de les exporter (CSV/OFX) vers le poste de travail ; elles sont **séparées** du projet principal et/ou non maintenues (source : wiki.gnucash.org/wiki/GnuCash_and_Mobile_Devices — « There is not an official GnuCash app for Android »).

### Fonctionnalités (relevé)

- **Partie double**, registre type chéquier, **transactions splittées** (répartition d'une écriture en plusieurs lignes pour taxes/frais) (source : gnucash.org/features).
- **Types de comptes** : actifs, passifs, revenus/dépenses (catégories), capitaux propres (equity), clients/fournisseurs (A/R, A/P) (source : gnucash.org/features).
- **Transactions planifiées** récurrentes avec rappels automatiques (source : gnucash.org/features).
- **Rapprochement bancaire** avec soldes rapprochés/pointés courants (source : gnucash.org/features).
- **Budget** : outils de planification budgétaire (source : gnucash.org/features).
- **Rapports & graphiques** : Bilan, Compte de résultat (P&L), Valorisation de portefeuille ; graphiques en barres, camemberts, nuages de points (source : gnucash.org/features — « Barcharts, Piecharts, Scatter plots »).
- **Import QIF** (migration depuis Quicken), **import/support OFX** avec détection de doublons (source : gnucash.org/features).
- **Import CSV** de transactions et de comptes _(fonction bien documentée dans le manuel ; la page features met surtout en avant QIF/OFX)_ — marqué présent.
- **Banque en ligne HBCI** : téléchargement de relevés et initiation de virements (surtout pour l'Allemagne) (source : gnucash.org/features — « HBCI protocol »). Support OFX Direct Connect également disponible côté import bancaire.
- **Multi-devises** : comptes en devises différentes, mouvements de devises équilibrés (source : gnucash.org/features).
- **Investissements / titres** : suivi d'actions individuelles ou en portefeuille, mise à jour automatique en ligne des cours (actions/fonds) (source : gnucash.org/features).
- **Petite entreprise** : clients/fournisseurs, jobs, facturation, paiement de factures, taxes, conditions de règlement, éléments de paie (source : gnucash.org/features).
- **Assistants** : remboursement d'emprunt/prêt hypothécaire, impression de chèques personnalisable (source : gnucash.org/features).
- **Format de fichier / stockage** : **XML** (par défaut) ou base **SQL** — SQLite3, MySQL, PostgreSQL (marqués expérimentaux) (source : gnucash.org/features).
- **Chiffrement** : pas de chiffrement de fichier intégré natif (repose sur la sécurité du système/base de données) _(absence de fonction dédiée ; non contredit par les sources primaires)_.

---

## 3. KMyMoney

### Vue d'ensemble

KMyMoney est le gestionnaire de finances personnelles de l'écosystème **KDE**. Il combine un moteur **en partie double** avec une ergonomie pensée pour l'utilisateur non technique (source : kmymoney.org — « double-entry accounting principles » ; « easiest open source personal finance manager to use, especially for the non-technical user »). Objectif affiché : offrir « les fonctionnalités les plus importantes des gestionnaires financiers commerciaux » (source : kmymoney.org).

Philosophie de données : **partie double** avec une présentation familière (comptes organisés par type Actif/Passif et par catégorie Revenu/Dépense) (source : kmymoney.org).

### Licence

GNU GPL (application KDE ; la licence GPL n'est pas citée mot pour mot sur la note de version mais est standard KDE) _(GPL confirmée par convention KDE ; libellé exact non cité sur source primaire dans cette session)_.

### Plateformes

Multi-plateforme : Linux, macOS, Windows (source : kmymoney.org — « cross-platform personal finance manager »). Construit sur **KDE Frameworks 6 / Qt6** (source : kmymoney.org, note de version 5.2.1). **Desktop.** Pas d'application mobile officielle _(non mentionnée sur les sources primaires — considérée absente)_.

### Dernière version / maintenance

**5.2.1** publiée le **2025-08-04** (release de maintenance : support KF6/Qt6 amélioré, correction d'un blocage avec les backends SQL) ; **5.2.0** le 2025-06-21 (source : kmymoney.org/2025/08/04/kmymoney-5-2-1-released.html). Activement maintenu par l'équipe KMyMoney sous gouvernance KDE.

### Fonctionnalités (relevé)

- **Partie double** avec vue de type grand livre (source : kmymoney.org).
- **Gestion des comptes** par type (Actif/Passif) et par catégorie (Revenu/Dépense) : création, édition, suppression, rapprochement, mise à jour (source : kmymoney.org — description des fonctionnalités du gestionnaire de comptes).
- **Catégorisation** des revenus et dépenses (source : idem).
- **Transactions planifiées** dans une « Schedule View », avec saisie automatique optionnelle dans le grand livre (source : kmymoney.org).
- **Budget** : prévisions de revenus/dépenses comparées au réalisé ; rapports budgétaires sous forme de graphiques ; alertes de dépassement mensuel sur la page d'accueil (source : kmymoney.org ; changelog).
- **Investissements** : suivi d'actions, obligations, fonds ; assistant de création d'investissement ; mise à jour en ligne des cours d'actions et devises (source : kmymoney.org ; changelog).
- **Rapports & graphiques** : rapports personnalisés épinglables sur la page d'accueil ; export CSV des rapports (source : kmymoney.org).
- **Recherche de transactions** puissante sur des années de données (source : kmymoney.org).
- **Import QIF** et **import OFX** (source : kmymoney.org — « QIF files can be imported… OFX import is also supported »).
- **Import CSV** via un greffon d'import CSV _(fonction documentée du produit ; non recitée sur la page d'accueil)_ — marqué présent.
- **Banque en ligne OFX et HBCI** via **AqBanking/Gwenhywfar** ; appariement manuel des transactions pour faciliter le rapprochement des relevés téléchargés (source : changelog KMyMoney ; note 5.2.1 mentionnant AqBanking/libofx).
- **Multi-devises** (mise à jour en ligne des cours de devises) (source : kmymoney.org).
- **Chiffrement GPG** : stockage des données chiffré via GPG, support de plusieurs clés et d'une **clé de récupération** détenue par un petit groupe de développeurs (source : kmymoney.org/recovery.html ; docs.kde.org handbook — « ciphers the data using GPG »).
- **Format de fichier / stockage** : XML (fichier `.kmy`, compressé, éventuellement **chiffré GPG**) ou base de données **SQL** (source : handbook docs.kde.org ; note 5.2.1 mentionnant les backends SQL).

---

## 4. Tableau comparatif

| Fonctionnalité                                  | Grisbi                                         | GnuCash                                                 | KMyMoney                                      |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| Modèle comptable                                | Partie **simple**                              | Partie **double**                                       | Partie **double**                             |
| Types de comptes (actif/passif, revenu/dépense) | ✓ (banque, caisse, actif, passif ; catégories) | ✓ (+ equity, clients/fournisseurs)                      | ✓ (Actif/Passif + Revenu/Dépense)             |
| Budget                                          | Partiel (lignes budgétaires, estimations)      | ✓                                                       | ✓ (prévision vs réalisé, alertes)             |
| Transactions récurrentes/planifiées             | ✓ (Scheduler)                                  | ✓ (+ rappels)                                           | ✓ (saisie auto optionnelle)                   |
| Catégorisation                                  | ✓ (catégories/sous-catégories)                 | ✓ (comptes revenus/dépenses)                            | ✓                                             |
| Rapprochement                                   | ✓                                              | ✓                                                       | ✓ (+ appariement manuel)                      |
| Multi-devises                                   | ✓                                              | ✓                                                       | ✓                                             |
| Investissements / titres                        | ✗ _(non mis en avant)_                         | ✓ (portefeuille, cours en ligne)                        | ✓ (actions/obligations/fonds, cours en ligne) |
| Rapports & graphiques                           | ✓ (rapports ; graphiques limités)              | ✓ (bilan, P&L, portefeuille ; barres/camemberts/nuages) | ✓ (rapports perso, graphiques, export CSV)    |
| Import QIF                                      | ✓                                              | ✓                                                       | ✓                                             |
| Import OFX                                      | ✓                                              | ✓                                                       | ✓                                             |
| Import CSV                                      | ✓                                              | ✓                                                       | ✓ (greffon)                                   |
| Import format natif tiers                       | ✓ (Gnucash)                                    | —                                                       | —                                             |
| Banque en ligne (HBCI / OFX Direct Connect)     | ✗                                              | ✓ (HBCI + OFX DirectConnect)                            | ✓ (OFX + HBCI via AqBanking)                  |
| Chiffrement / sécurité                          | Partiel _(non confirmé)_                       | ✗ (pas de chiffrement fichier natif)                    | ✓ (GPG multi-clés + clé de récupération)      |
| Application mobile officielle                   | ✗                                              | ✗ (compagnons tiers)                                    | ✗                                             |
| Format de fichier                               | XML `.gsb` _(probable)_                        | XML ou SQL (SQLite/MySQL/PostgreSQL)                    | XML `.kmy` (compressé/GPG) ou SQL             |
| Développement actif (2025)                      | ✓ (3.90.1, déc. 2025)                          | ✓ (5.13–5.16, 2025)                                     | ✓ (5.2.1, août 2025)                          |
| Licence                                         | GPL v2                                         | GPL                                                     | GPL (KDE)                                     |
| Plateformes                                     | Linux/Win/macOS (desktop)                      | Linux/BSD/Solaris/macOS/Win                             | Linux/macOS/Win (KDE/Qt6)                     |

Légende : ✓ = présent · ✗ = absent · Partiel = partiellement/indirectement couvert · _(non confirmé)_ = non vérifiable sur source primaire.

---

## 5. Forces / Faiblesses

### Grisbi

**Forces**

- Simplicité et faible courbe d'apprentissage : la partie simple évite d'imposer les concepts de débit/crédit.
- Bien adapté aux particuliers et **petites associations** (lignes budgétaires, exercices financiers, gestion de cartes).
- Import multi-formats (Gnucash, OFX, CSV, QIF) avec règles d'import rapide.
- Léger, multi-plateforme, GPL.

**Faiblesses**

- Pas de partie double : moins rigoureux pour qui veut une vraie comptabilité équilibrée.
- **Pas de banque en ligne** (ni HBCI ni Direct Connect) : tout passe par l'import de fichiers.
- Pas de suivi d'investissements/titres mis en avant.
- Reporting et graphiques plus limités que GnuCash/KMyMoney ; pas de mobile.

### GnuCash

**Forces**

- Moteur **partie double** robuste, niveau quasi professionnel ; états financiers complets (bilan, P&L, portefeuille).
- Couverture la plus large : investissements, petite entreprise (facturation, clients/fournisseurs, paie), assistants (prêts, chèques).
- Stockage flexible (XML **ou** SQL), banque en ligne HBCI/OFX, 61 langues, projet très actif.

**Faiblesses**

- Courbe d'apprentissage plus raide (concepts comptables) ; UX datée par rapport aux standards web modernes.
- Pas de chiffrement de fichier natif.
- Pas d'application mobile officielle (compagnons tiers seulement).

### KMyMoney

**Forces**

- Bon compromis **partie double + ergonomie** pour non-experts.
- Sécurité : **chiffrement GPG** natif (multi-clés + clé de récupération).
- Investissements, budget prévision/réalisé, rapports personnalisables, banque en ligne OFX/HBCI (AqBanking).
- Stockage XML ou SQL ; maintenu activement (KF6/Qt6).

**Faiblesses**

- Dépendance à l'écosystème KDE/Qt (moins naturel hors Linux, quoique multi-plateforme).
- Pas d'application mobile officielle.
- Moins orienté « petite entreprise/facturation » que GnuCash.

---

## 6. Cas d'usage

- **Particulier débutant / association simple, priorité à la simplicité** → **Grisbi**. La partie simple et les lignes budgétaires suffisent, sans jargon comptable.
- **Utilisateur avancé, comptabilité rigoureuse, investissements, voire micro-entreprise/facturation** → **GnuCash**. Le plus complet, au prix d'une prise en main plus exigeante.
- **Utilisateur soucieux d'un bon équilibre puissance/ergonomie et de la confidentialité (chiffrement)** → **KMyMoney**. Partie double accessible, chiffrement GPG, investissements et banque en ligne.
- **Besoin de banque en ligne directe (HBCI/OFX Direct Connect)** → GnuCash ou KMyMoney (Grisbi ne le propose pas).
- **Besoin de mobilité native** → aucun des trois ne fournit d'app mobile officielle ; à considérer comme un différenciateur pour fela.

---

## 7. Implications pour fela

fela est une application **web**, ce qui change plusieurs contraintes par rapport à ces trois logiciels desktop :

1. **Modèle de données** : la partie double (GnuCash, KMyMoney) est plus rigoureuse et déverrouille des états financiers fiables (bilan, P&L, patrimoine net), mais elle a un coût d'ergonomie. fela peut viser un **modèle partie double « caché »** : rigueur en interne, saisie simple façon Grisbi côté UX. C'est le positionnement gagnant de KMyMoney.
2. **Import** : QIF/OFX/CSV sont le socle commun attendu ; les trois les gèrent. fela devrait au minimum couvrir **CSV + OFX + QIF**.
3. **Banque en ligne** : l'absence de connexion bancaire directe est la principale faiblesse de Grisbi. Sur le web, l'équivalent moderne est l'**agrégation bancaire via API** (open banking / DSP2, ou agrégateurs type Plaid/Nordigen), un différenciateur fort vs ces trois apps historiques (HBCI/OFX Direct Connect).
4. **Investissements et multi-devises** : attendus par les utilisateurs avancés (GnuCash et KMyMoney les couvrent) ; mise à jour automatique des cours = valeur ajoutée.
5. **Budget** : la comparaison prévision/réalisé de KMyMoney est un bon modèle de référence UX.
6. **Sécurité** : KMyMoney chiffre les données (GPG). Pour une app web, l'équivalent est le **chiffrement au repos + isolation multi-tenant + auth forte** ; la confidentialité financière est un argument produit.
7. **Mobilité** : aucun des trois n'a de mobile natif crédible. Une app web responsive (ou PWA) est un avantage concurrentiel immédiat.
8. **UX** : ces trois apps ont des interfaces desktop datées. fela peut se différencier par une UX moderne, guidée (cf. la branche `feat/17-guided-empty-states` du dépôt), sans sacrifier la profondeur fonctionnelle.

---

## 8. Sources

### Grisbi

- Site officiel / accueil : https://www.grisbi.org/
- Page Features : https://en.grisbi.org/post/2013/01/26/Features
- Manuel (écran d'ouverture / fonctionnalités) : https://grisbi.sourceforge.net/html-en/grisbi-manuel-en005.html
- Manuel (import/export) : https://grisbi.sourceforge.net/html-en/grisbi-manuel-en006.html
- Dépôt GitHub : https://github.com/grisbi/grisbi
- SourceForge (téléchargements / licence GPL v2) : https://sourceforge.net/projects/grisbi/

### GnuCash

- Page Features : https://www.gnucash.org/features.phtml
- Accueil / licence & plateformes : https://www.gnucash.org/
- Annonces de version (5.13, 5.14…) : https://lists.gnucash.org/pipermail/gnucash-announce/
- Releases GitHub : https://github.com/Gnucash/gnucash/releases
- Wiki — GnuCash et mobile : https://wiki.gnucash.org/wiki/GnuCash_and_Mobile_Devices

### KMyMoney

- Accueil / description & modèle partie double : https://kmymoney.org/
- Note de version 5.2.1 (2025-08-04) : https://kmymoney.org/2025/08/04/kmymoney-5-2-1-released.html
- Note de version 5.2.0 (2025-06-21) : https://kmymoney.org/2025/06/21/kmymoney-5-2-0-released.html
- Changelog : https://kmymoney.org/changelog.html
- Clé de récupération / chiffrement : https://kmymoney.org/recovery.html
- Handbook KDE (fichier chiffré GPG) : https://docs.kde.org/ (KMyMoney Handbook, section « GPG-encrypted file »)
- Documentation : https://kmymoney.org/documentation.html

### Points non confirmés à partir de sources primaires (dans cette session)

- Extension de fichier Grisbi `.gsb` (largement documentée ailleurs, non recitée ici sur source primaire).
- Chiffrement de fichier Grisbi dans la version courante.
- Absence totale de suivi d'investissements dans Grisbi (déduit de l'absence de mention ; non affirmé par une page dédiée).
- Statut exact « stable vs développement » de Grisbi 3.90.1 (annoncé sur l'accueil, sans note de version détaillée consultée).
- Libellé exact de la licence GPL de KMyMoney (convention KDE, non cité mot pour mot).
- Import CSV de GnuCash et de KMyMoney : documenté dans les manuels produits mais non recité sur les pages « features » consultées.
