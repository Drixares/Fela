import { call } from "@orpc/server";
import { expect, test } from "vitest";

import type { ServerContext } from "../../context.js";
import { createTestContext } from "../../test/context.js";
import { appRouter } from "../_app.js";

/** Create an account and return its id — a fixture for the import tests. */
async function makeAccount(
  context: ServerContext,
  name = "Compte courant"
): Promise<number> {
  const account = await call(
    appRouter.accounts.create,
    { name, type: "checking", initialBalance: 0 },
    { context }
  );
  return account.id;
}

/**
 * A typical French bank export: `;` delimiter, dd/mm/yyyy dates, comma
 * decimals, a space as thousands separator.
 */
const BANK_CSV = [
  "Date;Montant;Libellé",
  "01/03/2026;-25,50;CARREFOUR",
  "02/03/2026;1 200,00;VIREMENT EMPLOYEUR",
  "03/03/2026;-8,90;BOULANGERIE PAUL",
].join("\n");

const BANK_MAPPING = { dateColumn: 0, amountColumn: 1, labelColumn: 2 };

test("imports.preview parses a French CSV and reports every row as new, without writing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  expect(preview.newCount).toBe(3);
  expect(preview.duplicateCount).toBe(0);
  expect(preview.rows).toHaveLength(3);
  expect(preview.rows[0]).toMatchObject({
    date: new Date("2026-03-01"),
    amount: -2_550,
    label: "CARREFOUR",
    duplicate: false,
  });
  expect(preview.rows[1]).toMatchObject({
    date: new Date("2026-03-02"),
    amount: 120_000,
    label: "VIREMENT EMPLOYEUR",
    duplicate: false,
  });

  // Preview is pure computation — nothing has been written.
  const transactions = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(transactions).toHaveLength(0);
});

test("imports.commit writes every row to the account and memorises the mapping", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // No mapping is known for the account before its first import.
  expect(
    await call(appRouter.imports.getMapping, { accountId }, { context })
  ).toBeNull();

  const result = await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );
  expect(result).toEqual({ imported: 3, duplicates: 0 });

  const transactions = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(transactions.transactions.map((t) => [t.payee, t.amount])).toEqual([
    ["BOULANGERIE PAUL", -890], // most recent first
    ["VIREMENT EMPLOYEUR", 120_000],
    ["CARREFOUR", -2_550],
  ]);

  // The mapping is persisted for the account, ready for the next import.
  expect(
    await call(appRouter.imports.getMapping, { accountId }, { context })
  ).toEqual(BANK_MAPPING);
});

test("re-importing the same CSV flags every row as a probable duplicate and writes nothing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // The preview announces the duplicates before anything is written.
  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );
  expect(preview.newCount).toBe(0);
  expect(preview.duplicateCount).toBe(3);
  expect(preview.rows.every((row) => row.duplicate)).toBe(true);

  const second = await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );
  expect(second).toEqual({ imported: 0, duplicates: 3 });

  const transactions = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(transactions).toHaveLength(3);
});

test("importing an overlapping period only adds the rows not already stored", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // The next export overlaps the previous one: its first two rows are the last
  // two of BANK_CSV — with cosmetic differences (case, extra spaces) that the
  // normalised fingerprint must see through — plus two genuinely new rows.
  const overlapping = [
    "Date;Montant;Libellé",
    "02/03/2026;1 200,00;Virement   employeur",
    "03/03/2026;-8,90;boulangerie paul",
    "04/03/2026;-15,00;SNCF",
    "05/03/2026;-42,10;EDF",
  ].join("\n");

  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: overlapping, mapping: BANK_MAPPING },
    { context }
  );
  expect(preview.newCount).toBe(2);
  expect(preview.duplicateCount).toBe(2);

  const result = await call(
    appRouter.imports.commit,
    { accountId, content: overlapping, mapping: BANK_MAPPING },
    { context }
  );
  expect(result).toEqual({ imported: 2, duplicates: 2 });

  const transactions = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(transactions).toHaveLength(5);
});

test("the same rows imported into another account are not duplicates", async () => {
  const context = createTestContext();
  const checking = await makeAccount(context, "Compte courant");
  const joint = await makeAccount(context, "Compte joint");

  await call(
    appRouter.imports.commit,
    { accountId: checking, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  const result = await call(
    appRouter.imports.commit,
    { accountId: joint, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );
  expect(result).toEqual({ imported: 3, duplicates: 0 });
});

test("two identical rows in one file both import, and a re-import skips both", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // Two genuinely identical movements — same day, same price, same label.
  const twoCoffees = [
    "Date;Montant;Libellé",
    "01/03/2026;-1,20;CAFE DE LA GARE",
    "01/03/2026;-1,20;CAFE DE LA GARE",
  ].join("\n");

  const first = await call(
    appRouter.imports.commit,
    { accountId, content: twoCoffees, mapping: BANK_MAPPING },
    { context }
  );
  expect(first).toEqual({ imported: 2, duplicates: 0 });

  const second = await call(
    appRouter.imports.commit,
    { accountId, content: twoCoffees, mapping: BANK_MAPPING },
    { context }
  );
  expect(second).toEqual({ imported: 0, duplicates: 2 });
});

test("a zero-amount row is skipped as noise instead of refusing the file", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // A waived fee shows up as 0,00 in some exports; it is no movement at all,
  // so it must neither import nor take the rest of the file down with it.
  const withZero = [
    "Date;Montant;Libellé",
    "01/03/2026;0,00;FRAIS OFFERTS",
    "02/03/2026;-5,00;CARREFOUR",
  ].join("\n");

  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: withZero, mapping: BANK_MAPPING },
    { context }
  );
  expect(preview.newCount).toBe(1);
  expect(preview.rows.map((row) => row.label)).toEqual(["CARREFOUR"]);

  const result = await call(
    appRouter.imports.commit,
    { accountId, content: withZero, mapping: BANK_MAPPING },
    { context }
  );
  expect(result).toEqual({ imported: 1, duplicates: 0 });
});

test("an invalid import is refused with a clear error and writes nothing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // A file whose third row has an unparsable date: the two valid rows before
  // it must not slip in — the whole file is refused, all-or-nothing.
  const badDate = [
    "Date;Montant;Libellé",
    "01/03/2026;-25,50;CARREFOUR",
    "02/03/2026;1 200,00;VIREMENT EMPLOYEUR",
    "pas une date;-8,90;BOULANGERIE PAUL",
  ].join("\n");
  await expect(
    call(
      appRouter.imports.commit,
      { accountId, content: badDate, mapping: BANK_MAPPING },
      { context }
    )
  ).rejects.toThrow(/pas une date/);

  // An unreadable file — no data rows at all.
  await expect(
    call(
      appRouter.imports.commit,
      { accountId, content: "juste du bruit", mapping: BANK_MAPPING },
      { context }
    )
  ).rejects.toThrow(/en-tête/);

  // An unparsable amount.
  const badAmount = ["Date;Montant;Libellé", "01/03/2026;abc;CARREFOUR"].join(
    "\n"
  );
  await expect(
    call(
      appRouter.imports.commit,
      { accountId, content: badAmount, mapping: BANK_MAPPING },
      { context }
    )
  ).rejects.toThrow(/montant/i);

  // An incoherent mapping — points beyond the file's columns.
  await expect(
    call(
      appRouter.imports.commit,
      {
        accountId,
        content: BANK_CSV,
        mapping: { dateColumn: 0, amountColumn: 1, labelColumn: 7 },
      },
      { context }
    )
  ).rejects.toThrow(/mapping/i);

  // An incoherent mapping — two values read from the same column.
  await expect(
    call(
      appRouter.imports.commit,
      {
        accountId,
        content: BANK_CSV,
        mapping: { dateColumn: 0, amountColumn: 1, labelColumn: 1 },
      },
      { context }
    )
  ).rejects.toThrow(/mapping/i);

  // Not one of the refused imports wrote a row or memorised a mapping.
  const transactions = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(transactions).toHaveLength(0);
  expect(
    await call(appRouter.imports.getMapping, { accountId }, { context })
  ).toBeNull();
});

test("the memorised mapping is reused when the next import sends none", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // First import maps the columns explicitly; the mapping is memorised.
  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // The next month's export goes through with no mapping at all.
  const nextMonth = [
    "Date;Montant;Libellé",
    "01/04/2026;-31,20;CARREFOUR",
    "02/04/2026;1 200,00;VIREMENT EMPLOYEUR",
  ].join("\n");

  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: nextMonth },
    { context }
  );
  expect(preview.newCount).toBe(2);

  const result = await call(
    appRouter.imports.commit,
    { accountId, content: nextMonth },
    { context }
  );
  expect(result).toEqual({ imported: 2, duplicates: 0 });

  // An account that never imported has no mapping to fall back on.
  const virgin = await makeAccount(context, "Livret");
  await expect(
    call(
      appRouter.imports.preview,
      { accountId: virgin, content: nextMonth },
      { context }
    )
  ).rejects.toThrow(/mapping/i);
});

test("imports.inspect returns the headers and sample rows the mapping screen needs", async () => {
  const context = createTestContext();

  const inspected = await call(
    appRouter.imports.inspect,
    { content: BANK_CSV },
    { context }
  );

  expect(inspected.headers).toEqual(["Date", "Montant", "Libellé"]);
  expect(inspected.sampleRows[0]).toEqual([
    "01/03/2026",
    "-25,50",
    "CARREFOUR",
  ]);
  expect(inspected.sampleRows.length).toBeLessThanOrEqual(5);

  // An unreadable file is refused here too, before any mapping is attempted.
  await expect(
    call(appRouter.imports.inspect, { content: "" }, { context })
  ).rejects.toThrow(/en-tête/);
});
