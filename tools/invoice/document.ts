export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const TEMPLATE_IDS = ["plain", "ruled", "letter"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export const FREE_TEMPLATE: TemplateId = "plain";

export const PAYMENT_METHODS = ["cash", "card", "transfer", "check", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FREE_FOOTER = "made with plainden";
export const RECEIPT_STAMP = "PAID";
export const LOGO_MAX_BYTES = 200 * 1024;
export const BODY_VERSION = 1;

const MAX_LINES = 50;
const MAX_MILLI = 9_999_999;
const MAX_MINOR = 99_999_999;

declare const logoBrand: unique symbol;
export type Logo = { readonly [logoBrand]: true; dataUrl: string };

declare const issuedBrand: unique symbol;

export type PartyDraft = {
  name: string;
  address: string;
  email: string;
  taxId: string;
};

export type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type CommonDraft = {
  from: PartyDraft;
  to: PartyDraft;
  number: string;
  currency: string;
  lines: readonly LineDraft[];
  taxPercent: string;
  notes: string;
  template: string;
  logo: Logo | null;
};

export type InvoiceDraft = CommonDraft & {
  kind: "invoice";
  issuedOn: string;
  dueOn: string;
};

export type ReceiptDraft = CommonDraft & {
  kind: "receipt";
  paidOn: string;
  method: string;
};

export type Draft = InvoiceDraft | ReceiptDraft;

export type Party = {
  name: string;
  address: string;
  email: string;
  taxId: string;
};

export type Line = {
  description: string;
  quantityMilli: number;
  unitMinor: number;
};

type CommonIssued = {
  v: typeof BODY_VERSION;
  from: Party;
  to: Party;
  number: string;
  currency: Currency;
  lines: readonly Line[];
  taxBasisPoints: number;
  notes: string;
  template: TemplateId;
  logo: string | null;
};

export type IssuedData =
  | (CommonIssued & { kind: "invoice"; issuedOn: string; dueOn: string })
  | (CommonIssued & { kind: "receipt"; paidOn: string; method: PaymentMethod });

export type Issued = IssuedData & { readonly [issuedBrand]: true };

export type Issue = { field: string; message: string };

export type PreviewLine = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type Preview = {
  kind: "invoice" | "receipt";
  template: TemplateId;
  heading: "Invoice" | "Receipt";
  numberLabel: "Invoice number" | "Receipt number";
  number: string;
  from: Party;
  to: Party;
  meta: readonly { label: string; value: string }[];
  lines: readonly PreviewLine[];
  subtotal: string;
  taxLabel: string;
  tax: string;
  total: string;
  notes: string;
  logo: Logo | null;
  stamp: typeof RECEIPT_STAMP | null;
  footer: typeof FREE_FOOTER | null;
  issues: readonly Issue[];
};

export type Plan = "free" | "paid";

export type InvoicePreset = {
  from?: Partial<PartyDraft>;
  to?: Partial<PartyDraft>;
  number?: string;
  currency?: string;
  taxPercent?: string;
  notes?: string;
  template?: string;
  lines?: readonly { description: string; quantity: string; unitPrice: string }[];
  issuedOn?: string;
  dueOn?: string;
};

export type ReceiptPreset = {
  from?: Partial<PartyDraft>;
  to?: Partial<PartyDraft>;
  number?: string;
  currency?: string;
  taxPercent?: string;
  notes?: string;
  template?: string;
  lines?: readonly { description: string; quantity: string; unitPrice: string }[];
  paidOn?: string;
  method?: string;
};

type CommonAction =
  | { type: "from" | "to"; field: keyof PartyDraft; value: string }
  | { type: "number" | "currency" | "taxPercent" | "notes" | "template"; value: string }
  | { type: "logo"; value: Logo | null }
  | { type: "line.add" }
  | { type: "line.remove"; key: string }
  | { type: "line.edit"; key: string; field: "description" | "quantity" | "unitPrice"; value: string };

export type InvoiceAction = CommonAction | { type: "issuedOn" | "dueOn"; value: string };

export type ReceiptAction = CommonAction | { type: "paidOn"; value: string } | { type: "method"; value: string };

export type DraftAction = InvoiceAction | ReceiptAction;

const emptyParty = (): PartyDraft => ({ name: "", address: "", email: "", taxId: "" });

function party(seed?: Partial<PartyDraft>): PartyDraft {
  return { ...emptyParty(), ...seed };
}

function blankLine(key: string): LineDraft {
  return { key, description: "", quantity: "", unitPrice: "" };
}

function linesFrom(seed?: readonly { description: string; quantity: string; unitPrice: string }[]): LineDraft[] {
  if (!seed || seed.length === 0) return [blankLine("line-1")];
  return seed.map((line, index) => ({ key: `line-${index + 1}`, ...line }));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const stableNow = new Date("2026-10-20T00:00:00.000Z");
const stableDay = isoDate(stableNow);

export function openInvoice(preset: InvoicePreset = {}, now?: Date): InvoiceDraft {
  return {
    kind: "invoice",
    from: party(preset.from),
    to: party(preset.to),
    number: preset.number ?? "",
    currency: preset.currency ?? "USD",
    lines: linesFrom(preset.lines),
    taxPercent: preset.taxPercent ?? "0",
    notes: preset.notes ?? "",
    template: preset.template ?? FREE_TEMPLATE,
    logo: null,
    issuedOn: preset.issuedOn ?? (now ? isoDate(now) : stableDay),
    dueOn: preset.dueOn ?? isoDate(addDays(now ?? stableNow, 14)),
  };
}

export function openReceipt(preset: ReceiptPreset = {}, now?: Date): ReceiptDraft {
  return {
    kind: "receipt",
    from: party(preset.from),
    to: party(preset.to),
    number: preset.number ?? "",
    currency: preset.currency ?? "USD",
    lines: linesFrom(preset.lines),
    taxPercent: preset.taxPercent ?? "0",
    notes: preset.notes ?? "",
    template: preset.template ?? FREE_TEMPLATE,
    logo: null,
    paidOn: preset.paidOn ?? (now ? isoDate(now) : stableDay),
    method: preset.method ?? "",
  };
}


function editParty(current: PartyDraft, field: keyof PartyDraft, value: string): PartyDraft {
  return { ...current, [field]: value };
}

function editLines(lines: readonly LineDraft[], action: CommonAction): readonly LineDraft[] {
  switch (action.type) {
    case "line.add":
      return lines.length >= MAX_LINES ? lines : [...lines, blankLine(crypto.randomUUID())];
    case "line.remove":
      return lines.filter((line) => line.key !== action.key);
    case "line.edit":
      return lines.map((line) => (line.key === action.key ? { ...line, [action.field]: action.value } : line));
    default:
      return lines;
  }
}

function applyCommon(draft: CommonDraft, action: CommonAction): CommonDraft {
  switch (action.type) {
    case "from":
      return { ...draft, from: editParty(draft.from, action.field, action.value) };
    case "to":
      return { ...draft, to: editParty(draft.to, action.field, action.value) };
    case "number":
      return { ...draft, number: action.value };
    case "currency":
      return { ...draft, currency: action.value };
    case "taxPercent":
      return { ...draft, taxPercent: action.value };
    case "notes":
      return { ...draft, notes: action.value };
    case "template":
      return { ...draft, template: action.value };
    case "logo":
      return { ...draft, logo: action.value };
    case "line.add":
    case "line.remove":
    case "line.edit":
      return { ...draft, lines: editLines(draft.lines, action) };
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export function reduce(draft: Draft, action: DraftAction): Draft {
  switch (draft.kind) {
    case "invoice":
      return reduceInvoice(draft, action);
    case "receipt":
      return reduceReceipt(draft, action);
    default: {
      const unreachable: never = draft;
      return unreachable;
    }
  }
}

function reduceInvoice(draft: InvoiceDraft, action: DraftAction): InvoiceDraft {
  switch (action.type) {
    case "method":
    case "paidOn":
      return draft;
    case "issuedOn":
      return { ...draft, issuedOn: action.value };
    case "dueOn":
      return { ...draft, dueOn: action.value };
    default:
      return { ...draft, ...applyCommon(draft, action) };
  }
}

function reduceReceipt(draft: ReceiptDraft, action: DraftAction): ReceiptDraft {
  switch (action.type) {
    case "issuedOn":
    case "dueOn":
      return draft;
    case "paidOn":
      return { ...draft, paidOn: action.value };
    case "method":
      return { ...draft, method: action.value };
    default:
      return { ...draft, ...applyCommon(draft, action) };
  }
}

function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export function formatMinor(currency: Currency, minor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
}

type Quote = { lineMinors: number[]; subtotal: number; tax: number; total: number };

function quote(lines: readonly Line[], taxBasisPoints: number): Quote {
  const lineMinors = lines.map((line) => roundDiv(line.quantityMilli * line.unitMinor, 1000));
  const subtotal = lineMinors.reduce((sum, minor) => sum + minor, 0);
  const tax = roundDiv(subtotal * taxBasisPoints, 10_000);
  return { lineMinors, subtotal, tax, total: subtotal + tax };
}

function isCurrency(value: string): value is Currency {
  return CURRENCIES.some((currency) => currency === value);
}

function isTemplate(value: string): value is TemplateId {
  return TEMPLATE_IDS.some((template) => template === value);
}

function isMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value);
}

function decimalPlaces(value: string): number {
  const dot = value.indexOf(".");
  return dot === -1 ? 0 : value.length - dot - 1;
}

function parseDecimal(value: string, places: number, scale: number): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (decimalPlaces(trimmed) > places) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const padded = `${frac}${"0".repeat(places)}`.slice(0, places);
  const minor = Number(whole) * scale + Number(padded.padEnd(places, "0"));
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

type Parsed = { ok: true; issued: IssuedData; kept: LineDraft[] } | { ok: false; issues: Issue[] };

function pushIssue(issues: Issue[], field: string, message: string) {
  issues.push({ field, message });
}

function parseParty(prefix: string, partyDraft: PartyDraft, issues: Issue[]): Party | null {
  const name = partyDraft.name.trim();
  const address = partyDraft.address.trim();
  const email = partyDraft.email.trim();
  const taxId = partyDraft.taxId.trim();
  if (!name) pushIssue(issues, `${prefix}.name`, "Enter a name.");
  if (address.length > 400) pushIssue(issues, `${prefix}.address`, "Address is too long.");
  if (taxId.length > 40) pushIssue(issues, `${prefix}.taxId`, "Tax id is too long.");
  if (email && !email.includes("@")) pushIssue(issues, `${prefix}.email`, "Email needs an @.");
  if (!name || address.length > 400 || taxId.length > 40 || (email && !email.includes("@"))) return null;
  return { name, address, email, taxId };
}

function parseLines(lines: readonly LineDraft[], issues: Issue[]): { kept: LineDraft[]; parsed: Line[] } | null {
  const kept: LineDraft[] = [];
  const parsed: Line[] = [];
  for (const line of lines) {
    const description = line.description.trim();
    const quantity = line.quantity.trim();
    const unitPrice = line.unitPrice.trim();
    if (!description && !quantity && !unitPrice) continue;
    if (!description || !quantity || !unitPrice) {
      pushIssue(issues, `line.${line.key}`, "Each line needs a description, quantity, and price.");
      continue;
    }
    const quantityMilli = parseDecimal(quantity, 3, 1000);
    const unitMinor = parseDecimal(unitPrice, 2, 100);
    if (quantityMilli === null || quantityMilli > MAX_MILLI) {
      pushIssue(issues, `line.${line.key}.quantity`, "Quantity must be a number with at most 3 decimals.");
    }
    if (unitMinor === null || unitMinor > MAX_MINOR) {
      pushIssue(issues, `line.${line.key}.unitPrice`, "Price must be a number with at most 2 decimals.");
    }
    if (quantityMilli === null || unitMinor === null || quantityMilli > MAX_MILLI || unitMinor > MAX_MINOR) continue;
    kept.push({ ...line, description, quantity, unitPrice });
    parsed.push({ description, quantityMilli, unitMinor });
  }
  if (parsed.length === 0) pushIssue(issues, "lines", "Add at least one line.");
  if (parsed.length > MAX_LINES) pushIssue(issues, "lines", "Use 50 lines or fewer.");
  if (issues.some((issue) => issue.field.startsWith("line") || issue.field === "lines")) return null;
  return { kept, parsed };
}

function parseDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function assess(draft: Draft): Parsed {
  const issues: Issue[] = [];
  const from = parseParty("from", draft.from, issues);
  const to = parseParty("to", draft.to, issues);
  const number = draft.number.trim();
  if (!number) pushIssue(issues, "number", "Enter a number.");
  if (!isCurrency(draft.currency)) pushIssue(issues, "currency", "Choose a currency.");
  const taxPercent = parseDecimal(draft.taxPercent.trim(), 2, 100);
  if (taxPercent === null || taxPercent > 10_000) pushIssue(issues, "taxPercent", "Tax percent must be from 0 to 100.");
  if (draft.notes.length > 1000) pushIssue(issues, "notes", "Notes are too long.");
  if (!isTemplate(draft.template)) pushIssue(issues, "template", "Choose a template.");
  const lines = parseLines(draft.lines, issues);
  if (draft.kind === "invoice") {
    if (!parseDate(draft.issuedOn)) pushIssue(issues, "issuedOn", "Use a YYYY-MM-DD date.");
    if (!parseDate(draft.dueOn)) pushIssue(issues, "dueOn", "Use a YYYY-MM-DD date.");
    if (parseDate(draft.issuedOn) && parseDate(draft.dueOn) && draft.dueOn < draft.issuedOn) {
      pushIssue(issues, "dueOn", "Due date is before the issue date.");
    }
  } else if (!parseDate(draft.paidOn)) {
    pushIssue(issues, "paidOn", "Use a YYYY-MM-DD date.");
  } else if (!isMethod(draft.method)) {
    pushIssue(issues, "method", "Choose a payment method.");
  }
  if (
    !from ||
    !to ||
    !number ||
    !isCurrency(draft.currency) ||
    taxPercent === null ||
    taxPercent > 10_000 ||
    draft.notes.length > 1000 ||
    !isTemplate(draft.template) ||
    !lines ||
    issues.length > 0
  ) {
    return { ok: false, issues };
  }
  const common: CommonIssued = {
    v: BODY_VERSION,
    from,
    to,
    number,
    currency: draft.currency,
    lines: lines.parsed,
    taxBasisPoints: taxPercent,
    notes: draft.notes.trim(),
    template: draft.template,
    logo: draft.logo?.dataUrl ?? null,
  };
  if (draft.kind === "invoice") {
    return {
      ok: true,
      kept: lines.kept,
      issued: { ...common, kind: "invoice", issuedOn: draft.issuedOn, dueOn: draft.dueOn },
    };
  }
  if (!isMethod(draft.method)) return { ok: false, issues };
  return {
    ok: true,
    kept: lines.kept,
    issued: { ...common, kind: "receipt", paidOn: draft.paidOn, method: draft.method },
  };
}

function seal(template: TemplateId, logo: Logo | null, plan: Plan): { template: TemplateId; logo: Logo | null; footer: typeof FREE_FOOTER | null } {
  if (plan === "free") return { template: FREE_TEMPLATE, logo: null, footer: FREE_FOOTER };
  return { template, logo, footer: null };
}

function headingFor(kind: Draft["kind"]): { heading: "Invoice" | "Receipt"; numberLabel: "Invoice number" | "Receipt number"; stamp: typeof RECEIPT_STAMP | null } {
  switch (kind) {
    case "invoice":
      return { heading: "Invoice", numberLabel: "Invoice number", stamp: null };
    case "receipt":
      return { heading: "Receipt", numberLabel: "Receipt number", stamp: RECEIPT_STAMP };
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function metaFor(draft: Draft): { label: string; value: string }[] {
  switch (draft.kind) {
    case "invoice":
      return [
        { label: "Issued", value: draft.issuedOn },
        { label: "Due", value: draft.dueOn },
      ];
    case "receipt":
      return [
        { label: "Paid", value: draft.paidOn },
        { label: "Method", value: draft.method },
      ];
    default: {
      const unreachable: never = draft;
      return unreachable;
    }
  }
}

function previewLines(draft: Draft, assessed: Parsed): PreviewLine[] {
  if (!assessed.ok) {
    return draft.lines.map((line) => ({
      key: line.key,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: "",
    }));
  }
  const priced = quote(assessed.issued.lines, assessed.issued.taxBasisPoints);
  return assessed.kept.map((line, index) => ({
    key: line.key,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: formatMinor(assessed.issued.currency, priced.lineMinors[index] ?? 0),
  }));
}

export function view(draft: Draft, plan: Plan): Preview {
  const assessed = assess(draft);
  const labels = headingFor(draft.kind);
  const template = isTemplate(draft.template) ? draft.template : FREE_TEMPLATE;
  const sealed = seal(template, draft.logo, plan);
  const currency = isCurrency(draft.currency) ? draft.currency : "USD";
  const priced = assessed.ok ? quote(assessed.issued.lines, assessed.issued.taxBasisPoints) : null;
  const taxPercent = assessed.ok ? (assessed.issued.taxBasisPoints / 100).toFixed(2) : draft.taxPercent;
  return {
    kind: draft.kind,
    template: sealed.template,
    heading: labels.heading,
    numberLabel: labels.numberLabel,
    number: assessed.ok ? assessed.issued.number : draft.number,
    from: assessed.ok ? assessed.issued.from : { ...draft.from },
    to: assessed.ok ? assessed.issued.to : { ...draft.to },
    meta: metaFor(draft),
    lines: previewLines(draft, assessed),
    subtotal: priced ? formatMinor(currency, priced.subtotal) : "",
    taxLabel: `Tax ${taxPercent}%`,
    tax: priced ? formatMinor(currency, priced.tax) : "",
    total: priced ? formatMinor(currency, priced.total) : "",
    notes: draft.notes,
    logo: sealed.logo,
    stamp: labels.stamp,
    footer: sealed.footer,
    issues: assessed.ok ? [] : assessed.issues,
  };
}

function brand(issued: IssuedData): Issued {
  return issued as Issued;
}

export function issue(draft: Draft): { ok: true; issued: Issued } | { ok: false; issues: readonly Issue[] } {
  const assessed = assess(draft);
  if (!assessed.ok) return assessed;
  return { ok: true, issued: brand(assessed.issued) };
}

export function toWire(issued: Issued): IssuedData {
  return { ...issued };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function parseIssued(input: unknown): { ok: true; issued: Issued } | { ok: false; issues: readonly Issue[] } {
  if (!isRecord(input)) return { ok: false, issues: [{ field: "body", message: "Document must be an object." }] };
  const draft = wireToDraft(input);
  if (!draft) return { ok: false, issues: [{ field: "body", message: "Document is missing fields." }] };
  return issue(draft);
}

function wireToDraft(input: Record<string, unknown>): Draft | null {
  if (input.v !== BODY_VERSION) return null;
  const kind = input.kind;
  const from = readParty(input.from);
  const to = readParty(input.to);
  const number = readString(input, "number");
  const currency = readString(input, "currency");
  const notes = readString(input, "notes");
  const template = readString(input, "template");
  const lines = readLines(input.lines);
  if (!from || !to || number === null || !currency || notes === null || !template || !lines) return null;
  const logo = input.logo === null ? null : typeof input.logo === "string" ? brandLogo(input.logo) : null;
  if (input.logo !== null && !logo) return null;
  const common = {
    from,
    to,
    number,
    currency,
    lines,
    taxPercent: typeof input.taxBasisPoints === "number" ? (input.taxBasisPoints / 100).toFixed(2) : "",
    notes,
    template,
    logo,
  };
  if (kind === "invoice") {
    const issuedOn = readString(input, "issuedOn");
    const dueOn = readString(input, "dueOn");
    if (!issuedOn || !dueOn) return null;
    return { ...common, kind, issuedOn, dueOn };
  }
  if (kind === "receipt") {
    const paidOn = readString(input, "paidOn");
    const method = readString(input, "method");
    if (!paidOn || !method) return null;
    return { ...common, kind, paidOn, method };
  }
  return null;
}

function readParty(value: unknown): PartyDraft | null {
  if (!isRecord(value)) return null;
  const name = readString(value, "name");
  const address = readString(value, "address");
  const email = readString(value, "email");
  const taxId = readString(value, "taxId");
  if (name === null || address === null || email === null || taxId === null) return null;
  return { name, address, email, taxId };
}

function readLines(value: unknown): LineDraft[] | null {
  if (!Array.isArray(value)) return null;
  const lines: LineDraft[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const description = readString(item, "description");
    const quantityMilli = item.quantityMilli;
    const unitMinor = item.unitMinor;
    if (description === null || typeof quantityMilli !== "number" || typeof unitMinor !== "number") return null;
    lines.push({
      key: crypto.randomUUID(),
      description,
      quantity: (quantityMilli / 1000).toString(),
      unitPrice: (unitMinor / 100).toFixed(2),
    });
  }
  return lines;
}

export function draftFromIssued(issued: Issued): Draft {
  const reparsed = wireToDraft(issued);
  if (!reparsed) return issued.kind === "invoice" ? openInvoice() : openReceipt();
  return reparsed;
}

export function titleOf(issued: Issued): string {
  const label = issued.kind === "invoice" ? "Invoice" : "Receipt";
  return `${label} ${issued.number}, ${issued.to.name}`.trim();
}

export function clientList(rows: readonly Issued[]): readonly Party[] {
  const seen = new Set<string>();
  const clients: Party[] = [];
  for (const row of rows) {
    const key = (row.to.email || row.to.name).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    clients.push(row.to);
  }
  return clients;
}

function brandLogo(dataUrl: string): Logo | null {
  if (!isLogoDataUrl(dataUrl)) return null;
  if (new TextEncoder().encode(dataUrl).length > LOGO_MAX_BYTES) return null;
  return { dataUrl } as Logo;
}

function isLogoDataUrl(value: string): boolean {
  return value.startsWith("data:image/png;base64,") || value.startsWith("data:image/jpeg;base64,");
}

export async function readLogo(file: File): Promise<{ ok: true; logo: Logo } | { ok: false; message: string }> {
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    return { ok: false, message: "Logo must be a PNG or JPEG." };
  }
  if (file.size > LOGO_MAX_BYTES) return { ok: false, message: "Logo must be 200 KB or smaller." };
  const dataUrl = await readFileAsDataUrl(file);
  const logo = brandLogo(dataUrl);
  if (!logo) return { ok: false, message: "Logo must be 200 KB or smaller." };
  return { ok: true, logo };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the logo."));
    reader.readAsDataURL(file);
  });
}
