import { afterEach, expect, test, vi } from "vitest";
import {
  clientList,
  draftFromIssued,
  draftFromSavedList,
  formatMinor,
  FREE_FOOTER,
  issue,
  openInvoice,
  openReceipt,
  parseIssued,
  RECEIPT_STAMP,
  reduce,
  stampInvoiceDates,
  stampReceiptDate,
  titleOf,
  view,
  type Issued,
} from "./document";

afterEach(() => {
  vi.useRealTimers();
});

const now = new Date("2026-10-20T12:00:00.000Z");

function readyInvoice() {
  return openInvoice(
    {
      from: { name: "Northwind Studio" },
      to: { name: "Harbour Co", email: "ada@harbour.example" },
      number: "CA-1001",
      currency: "CAD",
      taxPercent: "5",
      lines: [{ description: "Consulting", quantity: "2", unitPrice: "100.00" }],
      issuedOn: "2026-10-20",
      dueOn: "2026-11-03",
    },
    now,
  );
}

test("a complete invoice quotes tax once and shows the free footer", () => {
  const preview = view(readyInvoice(), "free");
  expect(preview.issues).toEqual([]);
  expect(preview.subtotal).toBe("CA$200.00");
  expect(preview.tax).toBe("CA$10.00");
  expect(preview.total).toBe("CA$210.00");
  expect(preview.footer).toBe(FREE_FOOTER);
  expect(preview.template).toBe("plain");
  expect(preview.stamp).toBeNull();
  expect(preview.lines[0]?.amount).toBe("CA$200.00");
});

test("a paid plan keeps the chosen template and drops the footer", () => {
  const draft = reduce(readyInvoice(), { type: "template", value: "letter" });
  const preview = view(draft, "paid");
  expect(preview.template).toBe("letter");
  expect(preview.footer).toBeNull();
  expect(preview.total).toBe("CA$210.00");
});

test("a receipt stamps PAID and rejects a missing method", () => {
  const draft = openReceipt(
    {
      from: { name: "Northwind Studio" },
      to: { name: "Harbour Co" },
      number: "R-9",
      lines: [{ description: "Rent", quantity: "1", unitPrice: "10.00" }],
      paidOn: "2026-10-20",
      method: "card",
    },
    now,
  );
  expect(view(draft, "free").stamp).toBe(RECEIPT_STAMP);
  expect(view(draft, "free").total).toBe("$10.00");
  const blocked = view(reduce(draft, { type: "method", value: "" }), "free");
  expect(blocked.issues.map((issue) => issue.field)).toContain("method");
  expect(blocked.total).toBe("");
});

test("editing a receipt does not change an invoice draft", () => {
  const invoice = readyInvoice();
  const next = reduce(invoice, { type: "method", value: "cash" });
  expect(next).toEqual(invoice);
  const edited = reduce(invoice, { type: "line.edit", key: invoice.lines[0]!.key, field: "unitPrice", value: "50.00" });
  expect(view(edited, "free").total).toBe("CA$105.00");
  expect(view(invoice, "free").total).toBe("CA$210.00");
});

test("half up rounding uses integer minor units", () => {
  const draft = openInvoice(
    {
      from: { name: "Ada" },
      to: { name: "Bea" },
      number: "1",
      currency: "USD",
      taxPercent: "10",
      lines: [{ description: "Hours", quantity: "1.5", unitPrice: "10.00" }],
    },
    now,
  );
  const preview = view(draft, "paid");
  expect(preview.subtotal).toBe("$15.00");
  expect(preview.tax).toBe("$1.50");
  expect(preview.total).toBe("$16.50");
  expect(formatMinor("USD", 1)).toBe("$0.01");
});

test("a saved document round trips without the footer", () => {
  const issued = issue(readyInvoice());
  expect(issued.ok).toBe(true);
  if (!issued.ok) return;
  expect("footer" in issued.issued).toBe(false);
  expect(titleOf(issued.issued)).toBe("Invoice CA-1001, Harbour Co");
  const again = issue(draftFromIssued(issued.issued));
  expect(again).toMatchObject({ ok: true, issued: { number: "CA-1001", taxBasisPoints: 500, currency: "CAD" } });
  const parsed = parseIssued(JSON.parse(JSON.stringify(issued.issued)));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(view(draftFromIssued(parsed.issued), "free").total).toBe("CA$210.00");
});

test("an omitted clock uses the current day", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-05T15:00:00.000Z"));
  expect(openInvoice().issuedOn).toBe("2024-03-05");
  expect(openReceipt().paidOn).toBe("2024-03-05");
  const invoice = openInvoice({}, now);
  const receipt = openReceipt({}, now);
  expect(stampInvoiceDates(invoice, {}, new Date("2024-03-05T15:00:00.000Z"))).toMatchObject({
    issuedOn: "2024-03-05",
    dueOn: "2024-03-19",
    number: "",
  });
  expect(stampReceiptDate(receipt, {}, new Date("2024-03-05T15:00:00.000Z")).paidOn).toBe("2024-03-05");
  const edited = { ...invoice, issuedOn: "2020-01-01" };
  expect(stampInvoiceDates(edited, {}).issuedOn).toBe("2020-01-01");
  expect(stampInvoiceDates(invoice, { issuedOn: "2021-02-02" })).toBe(invoice);
  expect(stampReceiptDate({ ...receipt, paidOn: "2020-01-01" }, {}).paidOn).toBe("2020-01-01");
});

test("names, numbers, and descriptions have a maximum length", () => {
  const named = view(reduce(readyInvoice(), { type: "from", field: "name", value: "a".repeat(121) }), "free");
  expect(named.issues.map((issue) => issue.message)).toContain("Name is too long.");
  const numbered = view(reduce(readyInvoice(), { type: "number", value: "1".repeat(41) }), "free");
  expect(numbered.issues.map((issue) => issue.message)).toContain("Number is too long.");
  const base = readyInvoice();
  const described = view(
    reduce(base, { type: "line.edit", key: base.lines[0]!.key, field: "description", value: "d".repeat(241) }),
    "free",
  );
  expect(described.issues.map((issue) => issue.message)).toContain("Description is too long.");
});

test("loading a saved list restores the newest matching document", () => {
  const issued = issue(readyInvoice());
  expect(issued.ok).toBe(true);
  if (!issued.ok) return;
  const restored = draftFromSavedList({ ok: true, documents: [issued.issued] }, "invoice");
  expect(restored?.to.name).toBe("Harbour Co");
  expect(draftFromSavedList({ ok: true, documents: [issued.issued] }, "receipt")).toBeNull();
});

test("the client list keeps the first party for an email", () => {
  const first = issue(readyInvoice());
  const second = issue(
    openInvoice(
      {
        from: { name: "Northwind Studio" },
        to: { name: "Other", email: "ada@harbour.example" },
        number: "2",
        lines: [{ description: "More", quantity: "1", unitPrice: "1.00" }],
      },
      now,
    ),
  );
  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) return;
  const clients = clientList([first.issued, second.issued] as Issued[]);
  expect(clients.map((client) => client.name)).toEqual(["Harbour Co"]);
});
