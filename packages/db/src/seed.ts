import type { Db } from "./index";
import { categories, categoryGroups } from "./schema";

/** Money in vs. money out — mirrors the app's category policy (CATEGORY_KINDS). */
type SeedKind = "income" | "expense";

interface SeedGroup {
  group: string;
  categories: { name: string; kind: SeedKind }[];
}

/**
 * The French starter set inserted into a brand-new database: ~8 groups and
 * ~25 leaf categories covering a typical household's money. It is a starting
 * point, not a fixture — every group and category is fully editable, movable
 * and deletable afterwards, and the app never re-seeds an existing database
 * (see {@link seedDefaultCategories}).
 */
export const DEFAULT_CATEGORY_SEED: SeedGroup[] = [
  {
    group: "Revenus",
    categories: [
      { name: "Salaire", kind: "income" },
      { name: "Freelance", kind: "income" },
      { name: "Remboursements", kind: "income" },
      { name: "Autres revenus", kind: "income" },
    ],
  },
  {
    group: "Logement",
    categories: [
      { name: "Loyer", kind: "expense" },
      { name: "Charges & copropriété", kind: "expense" },
      { name: "Électricité & gaz", kind: "expense" },
      { name: "Eau", kind: "expense" },
      { name: "Assurance habitation", kind: "expense" },
    ],
  },
  {
    group: "Alimentation",
    categories: [
      { name: "Courses", kind: "expense" },
      { name: "Restaurants", kind: "expense" },
      { name: "Café & bar", kind: "expense" },
    ],
  },
  {
    group: "Transport",
    categories: [
      { name: "Carburant", kind: "expense" },
      { name: "Transports en commun", kind: "expense" },
      { name: "Entretien véhicule", kind: "expense" },
    ],
  },
  {
    group: "Abonnements",
    categories: [
      { name: "Téléphonie & Internet", kind: "expense" },
      { name: "Streaming", kind: "expense" },
      { name: "Logiciels", kind: "expense" },
    ],
  },
  {
    group: "Santé",
    categories: [
      { name: "Médecin", kind: "expense" },
      { name: "Pharmacie", kind: "expense" },
      { name: "Mutuelle", kind: "expense" },
    ],
  },
  {
    group: "Loisirs",
    categories: [
      { name: "Sorties", kind: "expense" },
      { name: "Voyages", kind: "expense" },
      { name: "Sport", kind: "expense" },
      { name: "Shopping", kind: "expense" },
    ],
  },
  {
    group: "Divers",
    categories: [
      { name: "Impôts & taxes", kind: "expense" },
      { name: "Frais bancaires", kind: "expense" },
      { name: "Cadeaux", kind: "expense" },
    ],
  },
];

/**
 * Seed the French default category set into `db` — but only when the database
 * has never held categories or groups. This runs on every app start yet inserts
 * exactly once in a database's lifetime: a returning user (who may have edited,
 * renamed or deleted parts of the set) is never re-seeded, so their choices are
 * never overwritten and no duplicates ever appear.
 *
 * The whole set is written in a single SQL transaction, so a fresh database can
 * never end up half-seeded. Groups carry a `sortOrder` matching their order
 * here so the UI shows Revenus first, then the expense groups.
 *
 * @returns `true` if it seeded, `false` if the database already had data.
 */
export function seedDefaultCategories(db: Db): boolean {
  const hasGroup = db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .limit(1)
    .get();
  const hasCategory = db
    .select({ id: categories.id })
    .from(categories)
    .limit(1)
    .get();

  if (hasGroup || hasCategory) {
    return false;
  }

  db.transaction((tx) => {
    DEFAULT_CATEGORY_SEED.forEach((entry, index) => {
      const group = tx
        .insert(categoryGroups)
        .values({ name: entry.group, sortOrder: index })
        .returning()
        .get();

      tx.insert(categories)
        .values(
          entry.categories.map((category) => ({
            name: category.name,
            kind: category.kind,
            groupId: group.id,
          }))
        )
        .run();
    });
  });

  return true;
}
