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
  const list = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(list.transactions).toHaveLength(0);
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

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions).toHaveLength(3);
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

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions).toHaveLength(5);
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
  const list = await call(appRouter.transactions.list, undefined, {
    context,
  });
  expect(list.transactions).toHaveLength(0);
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

test("forcing a probable duplicate imports it exactly once, and a later re-import does not duplicate it", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // First import stores the three rows.
  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // Re-import the same file: all three collide with the stored fingerprints and
  // are flagged as probable duplicates. The user judges the first (CARREFOUR,
  // CSV line 2) a false positive — two genuinely distinct movements the
  // heuristic can't tell apart — and forces it in.
  const forced = await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING, forceLines: [2] },
    { context }
  );
  expect(forced).toEqual({ imported: 1, duplicates: 2 });

  // The forced row entered the ledger exactly once — alongside the original,
  // that is two CARREFOUR rows, no more.
  let list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions.filter((t) => t.payee === "CARREFOUR")).toHaveLength(
    2
  );

  // A later re-import with no forcing must not duplicate it again: its
  // fingerprint is now stored twice, so the multiset absorbs the file's single
  // occurrence and skips it like the other two.
  const again = await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );
  expect(again).toEqual({ imported: 0, duplicates: 3 });

  list = await call(appRouter.transactions.list, { accountId }, { context });
  expect(list.transactions.filter((t) => t.payee === "CARREFOUR")).toHaveLength(
    2
  );
});

test("an unforced probable duplicate stays ignored even when another on the same import is forced", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // Force only CARREFOUR (line 2); the other two duplicates stay ignored.
  const result = await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING, forceLines: [2] },
    { context }
  );
  expect(result).toEqual({ imported: 1, duplicates: 2 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  // VIREMENT and BOULANGERIE were not forced: still one of each.
  expect(
    list.transactions.filter((t) => t.payee === "VIREMENT EMPLOYEUR")
  ).toHaveLength(1);
  expect(
    list.transactions.filter((t) => t.payee === "BOULANGERIE PAUL")
  ).toHaveLength(1);
});

test("imports.preview attaches the matching stored transaction to each probable duplicate", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commit,
    { accountId, content: BANK_CSV, mapping: BANK_MAPPING },
    { context }
  );

  // A second export overlaps: the first row repeats CARREFOUR with a cosmetic
  // label difference (case, spacing) the normalised fingerprint sees through;
  // the second is genuinely new.
  const overlapping = [
    "Date;Montant;Libellé",
    "01/03/2026;-25,50;Carrefour",
    "06/03/2026;-3,40;FRANPRIX",
  ].join("\n");

  const preview = await call(
    appRouter.imports.preview,
    { accountId, content: overlapping, mapping: BANK_MAPPING },
    { context }
  );

  expect(preview.newCount).toBe(1);
  expect(preview.duplicateCount).toBe(1);

  const duplicate = preview.rows.find((row) => row.duplicate);
  expect(duplicate).toBeDefined();
  // The matching stored transaction is surfaced so the user can judge the
  // collision — it carries the label as it was stored, not the file's wording.
  expect(duplicate?.existing).toMatchObject({
    date: new Date("2026-03-01"),
    amount: -2_550,
    label: "CARREFOUR",
  });

  // A row that is not a duplicate carries no existing match.
  const fresh = preview.rows.find((row) => !row.duplicate);
  expect(fresh?.existing).toBeNull();
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

// --- OFX import (issue #11) ------------------------------------------------

/**
 * A typical French bank OFX 1.x export (SGML tag-soup: header block, aggregate
 * tags closed, leaf values left unclosed). Each movement carries its own FITID,
 * so there is no column-mapping step and dedup is exact.
 */
function ofxStatement(
  transactions: { fitid: string; date: string; amount: string; name: string }[]
): string {
  const lines = transactions
    .map((t) =>
      [
        "<STMTTRN>",
        "<TRNTYPE>DEBIT",
        `<DTPOSTED>${t.date}`,
        `<TRNAMT>${t.amount}`,
        `<FITID>${t.fitid}`,
        `<NAME>${t.name}`,
        "</STMTTRN>",
      ].join("\n")
    )
    .join("\n");
  return [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "COMPRESSION:NONE",
    "OLDFILEUID:NONE",
    "NEWFILEUID:NONE",
    "",
    "<OFX>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<TRNUID>1",
    "<STMTRS>",
    "<CURDEF>EUR",
    "<BANKACCTFROM>",
    "<BANKID>30003",
    "<ACCTID>00012345678",
    "<ACCTTYPE>CHECKING",
    "</BANKACCTFROM>",
    "<BANKTRANLIST>",
    "<DTSTART>20260301",
    "<DTEND>20260331",
    lines,
    "</BANKTRANLIST>",
    "<LEDGERBAL>",
    "<BALAMT>1165.60",
    "<DTASOF>20260303",
    "</LEDGERBAL>",
    "</STMTRS>",
    "</STMTTRNRS>",
    "</BANKMSGSRSV1>",
    "</OFX>",
  ].join("\n");
}

const BANK_OFX = ofxStatement([
  {
    fitid: "FT-2026-0301-01",
    date: "20260301",
    amount: "-25.50",
    name: "CARREFOUR",
  },
  {
    fitid: "FT-2026-0302-02",
    date: "20260302",
    amount: "1200.00",
    name: "VIREMENT EMPLOYEUR",
  },
  {
    fitid: "FT-2026-0303-03",
    date: "20260303",
    amount: "-8.90",
    name: "BOULANGERIE PAUL",
  },
]);

test("imports.previewOfx parses an OFX statement and reports every row as new, without writing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const preview = await call(
    appRouter.imports.previewOfx,
    { accountId, content: BANK_OFX },
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
  const list = await call(appRouter.transactions.list, undefined, { context });
  expect(list.transactions).toHaveLength(0);
});

test("imports.commitOfx writes every statement transaction to the account", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const result = await call(
    appRouter.imports.commitOfx,
    { accountId, content: BANK_OFX },
    { context }
  );
  expect(result).toEqual({ imported: 3, duplicates: 0 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions.map((t) => [t.payee, t.amount])).toEqual([
    ["BOULANGERIE PAUL", -890], // most recent first
    ["VIREMENT EMPLOYEUR", 120_000],
    ["CARREFOUR", -2_550],
  ]);
});

test("re-importing an overlapping OFX period creates no duplicate (FITID)", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commitOfx,
    { accountId, content: BANK_OFX },
    { context }
  );

  // The next export overlaps the previous one: its first two movements repeat
  // the last two FITIDs — even though the bank re-worded a label and re-posted
  // one on a later day — plus two genuinely new movements.
  const overlapping = ofxStatement([
    {
      fitid: "FT-2026-0302-02",
      date: "20260302",
      amount: "1200.00",
      name: "Virement employeur",
    },
    {
      fitid: "FT-2026-0303-03",
      date: "20260304",
      amount: "-8.90",
      name: "Boulangerie Paul SARL",
    },
    {
      fitid: "FT-2026-0304-04",
      date: "20260304",
      amount: "-15.00",
      name: "SNCF",
    },
    {
      fitid: "FT-2026-0305-05",
      date: "20260305",
      amount: "-42.10",
      name: "EDF",
    },
  ]);

  const preview = await call(
    appRouter.imports.previewOfx,
    { accountId, content: overlapping },
    { context }
  );
  expect(preview.newCount).toBe(2);
  expect(preview.duplicateCount).toBe(2);

  const result = await call(
    appRouter.imports.commitOfx,
    { accountId, content: overlapping },
    { context }
  );
  expect(result).toEqual({ imported: 2, duplicates: 2 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions).toHaveLength(5);
});

test("re-importing the same OFX flags every row as a duplicate and writes nothing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  await call(
    appRouter.imports.commitOfx,
    { accountId, content: BANK_OFX },
    { context }
  );

  const preview = await call(
    appRouter.imports.previewOfx,
    { accountId, content: BANK_OFX },
    { context }
  );
  expect(preview.newCount).toBe(0);
  expect(preview.duplicateCount).toBe(3);
  expect(preview.rows.every((row) => row.duplicate)).toBe(true);

  const second = await call(
    appRouter.imports.commitOfx,
    { accountId, content: BANK_OFX },
    { context }
  );
  expect(second).toEqual({ imported: 0, duplicates: 3 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions).toHaveLength(3);
});

test("commitOfx reads an OFX 1.x file whose STMTTRN aggregates are left unclosed", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // Some banks' OFX 1.x SGML omits the </STMTTRN> closing tag entirely; the
  // parser must still recover both movements rather than refuse the file.
  const unclosed = [
    "<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>",
    "<STMTTRN>",
    "<TRNTYPE>DEBIT",
    "<DTPOSTED>20260301",
    "<TRNAMT>-25.50",
    "<FITID>FT-A",
    "<NAME>CARREFOUR",
    "<STMTTRN>",
    "<TRNTYPE>CREDIT",
    "<DTPOSTED>20260302",
    "<TRNAMT>1200.00",
    "<FITID>FT-B",
    "<NAME>VIREMENT EMPLOYEUR",
    "</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>",
  ].join("\n");

  const result = await call(
    appRouter.imports.commitOfx,
    { accountId, content: unclosed },
    { context }
  );
  expect(result).toEqual({ imported: 2, duplicates: 0 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions.map((t) => [t.payee, t.amount])).toEqual([
    ["VIREMENT EMPLOYEUR", 120_000],
    ["CARREFOUR", -2_550],
  ]);
});

test("a zero-amount OFX movement is kept — it carries a FITID, so it is not noise", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  const withZero = ofxStatement([
    {
      fitid: "FT-ZERO",
      date: "20260301",
      amount: "0.00",
      name: "REGULARISATION",
    },
    { fitid: "FT-REAL", date: "20260302", amount: "-5.00", name: "CARREFOUR" },
  ]);

  const result = await call(
    appRouter.imports.commitOfx,
    { accountId, content: withZero },
    { context }
  );
  expect(result).toEqual({ imported: 2, duplicates: 0 });

  const list = await call(
    appRouter.transactions.list,
    { accountId },
    { context }
  );
  expect(list.transactions.map((t) => t.amount)).toEqual([-500, 0]);
});

test("the same OFX imported into another account is not a duplicate", async () => {
  const context = createTestContext();
  const checking = await makeAccount(context, "Compte courant");
  const joint = await makeAccount(context, "Compte joint");

  await call(
    appRouter.imports.commitOfx,
    { accountId: checking, content: BANK_OFX },
    { context }
  );

  const result = await call(
    appRouter.imports.commitOfx,
    { accountId: joint, content: BANK_OFX },
    { context }
  );
  expect(result).toEqual({ imported: 3, duplicates: 0 });
});

test("an invalid OFX import is refused with a clear error and writes nothing", async () => {
  const context = createTestContext();
  const accountId = await makeAccount(context);

  // A file with no statement transaction at all is unreadable.
  await expect(
    call(
      appRouter.imports.commitOfx,
      { accountId, content: "ce n'est pas de l'OFX" },
      { context }
    )
  ).rejects.toThrow(/STMTTRN/);

  // A statement transaction with an unparsable date: the valid rows around it
  // must not slip in — the whole file is refused, all-or-nothing.
  const badDate = ofxStatement([
    { fitid: "FT-1", date: "20260301", amount: "-25.50", name: "CARREFOUR" },
    {
      fitid: "FT-2",
      date: "pas-une-date",
      amount: "-8.90",
      name: "BOULANGERIE",
    },
  ]);
  await expect(
    call(
      appRouter.imports.commitOfx,
      { accountId, content: badDate },
      { context }
    )
  ).rejects.toThrow(/date/i);

  // An unparsable amount.
  const badAmount = ofxStatement([
    { fitid: "FT-3", date: "20260301", amount: "abc", name: "CARREFOUR" },
  ]);
  await expect(
    call(
      appRouter.imports.commitOfx,
      { accountId, content: badAmount },
      { context }
    )
  ).rejects.toThrow(/montant/i);

  // A statement transaction missing its FITID — dedup has no key to work with.
  const noFitid = [
    "<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>",
    "<STMTTRN>",
    "<DTPOSTED>20260301",
    "<TRNAMT>-25.50",
    "<NAME>CARREFOUR",
    "</STMTTRN>",
    "</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>",
  ].join("\n");
  await expect(
    call(
      appRouter.imports.commitOfx,
      { accountId, content: noFitid },
      { context }
    )
  ).rejects.toThrow(/FITID/i);

  // None of the refused imports wrote a row.
  const list = await call(appRouter.transactions.list, undefined, { context });
  expect(list.transactions).toHaveLength(0);
});
