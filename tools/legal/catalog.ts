export const NOTICE = "This draft is not legal advice.";
export const ATTRIBUTION = "made with plainden";
export const PLAN_DOWNLOAD_MESSAGE = "Markdown and PDF need the legal plan.";

export const legalLimits = {
  free: { savedItems: 0 },
  paid: {},
} as const;

export const jurisdictions = ["US", "Canada", "EU/UK", "Australia", "Other"] as const;

const MAX_ANSWER = 400;

type PolicyKind = "privacy" | "terms" | "cookie" | "refund";
type Control = "text" | "jurisdiction";
type Jurisdiction = (typeof jurisdictions)[number];

type Slot = {
  id: string;
  label: string;
  control: Control;
  lead: string;
  trail: string;
};

type Tail = {
  kind: PolicyKind;
  slug: string;
  title: string;
  intro: string;
  question: string;
  answer: string;
  answers: Record<string, string>;
};

export type PolicyPlan = "free" | "paid";

export type PolicyField = {
  id: string;
  label: string;
  control: Control;
  value: string;
};

export type PolicyPage = {
  slug: string;
  title: string;
  intro: string;
  preset: string;
  faq: readonly [{ question: string; answer: string }];
};

const sharedSlots: readonly Slot[] = [
  { id: "businessName", label: "Business name", control: "text", lead: "This service is run by ", trail: "." },
  { id: "contactEmail", label: "Contact email", control: "text", lead: "Contact ", trail: " about this policy." },
  { id: "website", label: "Website", control: "text", lead: "The website is ", trail: "." },
  {
    id: "jurisdiction",
    label: "Jurisdiction",
    control: "jurisdiction",
    lead: "The operator points at ",
    trail: " for this draft.",
  },
];

const kindSlots: Record<PolicyKind, { title: string; slots: readonly Slot[] }> = {
  privacy: {
    title: "Privacy policy",
    slots: [
      ...sharedSlots,
      { id: "dataCollected", label: "Data collected", control: "text", lead: "The data collected is ", trail: "." },
      { id: "purpose", label: "Purpose", control: "text", lead: "The purpose is ", trail: "." },
      { id: "retention", label: "Retention", control: "text", lead: "The data is kept for ", trail: "." },
    ],
  },
  terms: {
    title: "Terms and conditions",
    slots: [
      ...sharedSlots,
      { id: "product", label: "Product", control: "text", lead: "These terms cover ", trail: "." },
      { id: "acceptableUse", label: "Acceptable use", control: "text", lead: "Acceptable use is ", trail: "." },
      { id: "termination", label: "Termination", control: "text", lead: "The agreement ends when ", trail: "." },
    ],
  },
  cookie: {
    title: "Cookie policy",
    slots: [
      ...sharedSlots,
      { id: "cookieName", label: "Cookie name", control: "text", lead: "The cookie named in this draft is ", trail: "." },
      { id: "purpose", label: "Purpose", control: "text", lead: "The purpose is ", trail: "." },
      { id: "duration", label: "Duration", control: "text", lead: "The cookie lasts ", trail: "." },
    ],
  },
  refund: {
    title: "Refund policy",
    slots: [
      ...sharedSlots,
      { id: "window", label: "Refund window", control: "text", lead: "The refund window is ", trail: "." },
      { id: "method", label: "Refund method", control: "text", lead: "Refunds are paid by ", trail: "." },
      { id: "exceptions", label: "Exceptions", control: "text", lead: "The exceptions are ", trail: "." },
    ],
  },
};

const primarySlugs: Record<string, PolicyKind> = {
  "privacy-policy-generator": "privacy",
  "terms-and-conditions-generator": "terms",
  "cookie-policy-generator": "cookie",
  "refund-policy-generator": "refund",
};

const legalTails: readonly Tail[] = [
  {
    kind: "privacy",
    slug: "privacy-policy-generator-for-app",
    title: "Privacy policy generator for an app",
    intro:
      "This sample is a privacy draft for an app that stores an account email and crash logs. Change the business name and the retention period before you copy it.",
    question: "Does this sample file the policy for me?",
    answer: "No. It fills a draft for Northwind Apps. You copy the text and publish it yourself.",
    answers: {
      businessName: "Northwind Apps",
      contactEmail: "privacy@northwind.example",
      website: "https://northwind.example",
      jurisdiction: "US",
      dataCollected: "account email and crash logs",
      purpose: "to run the app and fix crashes",
      retention: "18 months after the account closes",
    },
  },
  {
    kind: "privacy",
    slug: "privacy-policy-generator-for-meta-ads",
    title: "Privacy policy generator for ad clicks",
    intro:
      "This sample is a privacy draft for a site that measures ad clicks. It names the click ids you collect and how long you keep them.",
    question: "Does this sample talk to an ad network?",
    answer: "No. It only writes the click ids and the 90 day retention you can edit.",
    answers: {
      businessName: "Harbor Ads",
      contactEmail: "ads@harbor.example",
      website: "https://harbor.example",
      jurisdiction: "Canada",
      dataCollected: "ad click ids and page views",
      purpose: "to measure ad campaigns",
      retention: "90 days",
    },
  },
  {
    kind: "privacy",
    slug: "privacy-policy-generator-for-blogger",
    title: "Privacy policy generator for a blogger",
    intro:
      "This sample is a privacy draft for a blog that stores comment names. It is a starting point you edit, and it is not a filing with a regulator.",
    question: "Does this cover comments only?",
    answer: "The sample names comment names and email addresses. Add any other data you store before you publish.",
    answers: {
      businessName: "Lantern Blog",
      contactEmail: "hello@lantern.example",
      website: "https://lantern.example",
      jurisdiction: "Australia",
      dataCollected: "comment names and email addresses",
      purpose: "to publish comments",
      retention: "until the comment is deleted",
    },
  },
  {
    kind: "terms",
    slug: "terms-and-conditions-generator-for-saas",
    title: "Terms and conditions generator for SaaS",
    intro:
      "This sample covers a hosted workspace and a notice period of 30 days. Edit the product name so the draft matches what you actually sell.",
    question: "Is the 30 day notice required?",
    answer: "Only in this sample. Replace it with the notice period you offer.",
    answers: {
      businessName: "Cobalt SaaS",
      contactEmail: "legal@cobalt.example",
      website: "https://cobalt.example",
      jurisdiction: "EU/UK",
      product: "the Cobalt hosted workspace",
      acceptableUse: "no resale of the workspace",
      termination: "either party gives 30 days notice",
    },
  },
  {
    kind: "terms",
    slug: "terms-and-conditions-generator-for-marketplace",
    title: "Terms and conditions generator for a marketplace",
    intro:
      "This sample covers a seller marketplace and the rule that a listing must describe the real item. Change the operator name and the jurisdiction before you publish it.",
    question: "Does this take a fee from sellers?",
    answer: "No. The sample only states the listing rule and when a shop can be closed.",
    answers: {
      businessName: "Market Lane",
      contactEmail: "sellers@marketlane.example",
      website: "https://marketlane.example",
      jurisdiction: "Other",
      product: "the Market Lane seller marketplace",
      acceptableUse: "listings must describe the real item",
      termination: "the operator closes a shop that breaks the listing rules",
    },
  },
];

const cookieRefundTails: readonly Tail[] = [
  {
    kind: "cookie",
    slug: "cookie-policy-generator-for-shop",
    title: "Cookie policy generator for a shop",
    intro:
      "This sample names a cart cookie and a lifetime of 14 days. Use it when a store needs a short cookie draft it can edit.",
    question: "Will this set the cookie?",
    answer: "No. It names cart_id in the draft. Your shop sets the cookie.",
    answers: {
      businessName: "Cedar Shop",
      contactEmail: "shop@cedar.example",
      website: "https://cedar.example",
      jurisdiction: "US",
      cookieName: "cart_id",
      purpose: "to keep the shopping cart",
      duration: "14 days",
    },
  },
  {
    kind: "cookie",
    slug: "cookie-policy-generator-for-analytics",
    title: "Cookie policy generator for analytics",
    intro:
      "This sample names a visit counter cookie kept for 6 months. Replace the cookie name with the one your site actually sets.",
    question: "Does this install an analytics script?",
    answer: "No. It drafts the name visit_count and the 6 month duration.",
    answers: {
      businessName: "Bright Metrics",
      contactEmail: "hello@bright.example",
      website: "https://bright.example",
      jurisdiction: "Canada",
      cookieName: "visit_count",
      purpose: "to count return visits",
      duration: "6 months",
    },
  },
  {
    kind: "cookie",
    slug: "cookie-policy-generator-for-app",
    title: "Cookie policy generator for an app",
    intro:
      "This sample names a session cookie that keeps someone signed in for 7 days. It is a draft for an app, and you still choose the real duration.",
    question: "Is the session cookie required?",
    answer: "The sample uses session_token for 7 days. Change both if your app uses something else.",
    answers: {
      businessName: "Northwind Apps",
      contactEmail: "privacy@northwind.example",
      website: "https://northwind.example",
      jurisdiction: "Australia",
      cookieName: "session_token",
      purpose: "to keep a signed-in session",
      duration: "7 days",
    },
  },
  {
    kind: "refund",
    slug: "refund-policy-generator-for-digital-goods",
    title: "Refund policy generator for digital goods",
    intro:
      "This sample gives 14 days to ask for a refund of a downloaded file. It names the original card as the refund method and excludes custom files that were opened.",
    question: "Are opened custom files refundable in the sample?",
    answer: "No. The sample lists opened custom files as the exception.",
    answers: {
      businessName: "Pixel Press",
      contactEmail: "refunds@pixel.example",
      website: "https://pixel.example",
      jurisdiction: "EU/UK",
      window: "14 days from purchase",
      method: "the original payment card",
      exceptions: "opened custom files",
    },
  },
  {
    kind: "refund",
    slug: "refund-policy-generator-for-services",
    title: "Refund policy generator for services",
    intro:
      "This sample lets a client cancel a session up to 7 days before it starts. Refunds go out by bank transfer, and a session that already happened is an exception.",
    question: "Does a finished session get a refund in the sample?",
    answer: "No. The sample says sessions that already happened are the exception.",
    answers: {
      businessName: "Field Studio",
      contactEmail: "billing@field.example",
      website: "https://field.example",
      jurisdiction: "Other",
      window: "7 days before the session",
      method: "bank transfer",
      exceptions: "sessions that already happened",
    },
  },
];

const tails = [...legalTails, ...cookieRefundTails];

const presets = new Map<string, { kind: PolicyKind; answers: Record<string, string> }>(
  tails.map((tail) => [tail.slug, { kind: tail.kind, answers: tail.answers }]),
);

const slugKind = new Map<string, PolicyKind>([
  ...Object.entries(primarySlugs),
  ...tails.map((tail) => [tail.slug, tail.kind] as const),
]);

function pageOf(tail: Tail): PolicyPage {
  return {
    slug: tail.slug,
    title: tail.title,
    intro: tail.intro,
    preset: tail.slug,
    faq: [{ question: tail.question, answer: tail.answer }],
  };
}

export const legalLongTail: readonly PolicyPage[] = legalTails.map(pageOf);
export const cookieRefundLongTail: readonly PolicyPage[] = cookieRefundTails.map(pageOf);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is PolicyKind {
  return value === "privacy" || value === "terms" || value === "cookie" || value === "refund";
}

function isJurisdiction(value: string): value is Jurisdiction {
  return (jurisdictions as readonly string[]).includes(value);
}

type Parsed =
  | { ok: true; kind: PolicyKind; values: Record<string, string> }
  | { ok: false; message: string };

function parsePolicy(raw: unknown): Parsed {
  if (!isRecord(raw) || !isKind(raw.kind)) return { ok: false, message: "Unknown kind." };
  const slots = kindSlots[raw.kind].slots;
  if (!isRecord(raw.answers)) return { ok: false, message: "Missing answers." };
  const rawStrings: Record<string, string> = {};
  for (const slot of slots) {
    const value = raw.answers[slot.id];
    if (typeof value !== "string") return { ok: false, message: "Missing answers." };
    rawStrings[slot.id] = value;
  }
  for (const key of Object.keys(raw.answers)) {
    if (!slots.some((slot) => slot.id === key)) return { ok: false, message: `Unknown key ${key}.` };
  }
  const values: Record<string, string> = {};
  for (const slot of slots) {
    const value = (rawStrings[slot.id] ?? "").trim();
    if (value.length === 0) return { ok: false, message: "Empty answer." };
    values[slot.id] = value;
  }
  for (const slot of slots) {
    const value = values[slot.id] ?? "";
    if (value.length > MAX_ANSWER) return { ok: false, message: "Answer is over 400 characters." };
  }
  const jurisdiction = values.jurisdiction ?? "";
  if (!isJurisdiction(jurisdiction)) {
    return { ok: false, message: "Jurisdiction must be US, Canada, EU/UK, Australia, or Other." };
  }
  return { ok: true, kind: raw.kind, values };
}

function render(kind: PolicyKind, values: Record<string, string>): { title: string; text: string } {
  const spec = kindSlots[kind];
  const blocks = [spec.title, NOTICE];
  for (const slot of spec.slots) {
    blocks.push(`${slot.label}\n${slot.lead}${values[slot.id] ?? ""}${slot.trail}`);
  }
  return { title: spec.title, text: blocks.join("\n\n") };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Markdown =
  | { ok: true; text: string }
  | { ok: false; error: "plan"; message: typeof PLAN_DOWNLOAD_MESSAGE };

function htmlOf(text: string): string {
  return text
    .split("\n\n")
    .map((block) => `<p>${escapeHtml(block).replaceAll("\n", "<br>\n")}</p>`)
    .join("\n");
}

function project(plan: PolicyPlan, paid: string): { text: string; html: string; markdown: Markdown } {
  switch (plan) {
    case "free": {
      const text = `${paid}\n\n${ATTRIBUTION}`;
      return {
        text,
        html: htmlOf(text),
        markdown: { ok: false, error: "plan", message: PLAN_DOWNLOAD_MESSAGE },
      };
    }
    case "paid":
      return { text: paid, html: htmlOf(paid), markdown: { ok: true, text: `# ${paid}` } };
    default: {
      const unreachable: never = plan;
      return unreachable;
    }
  }
}

export function questionnaire(slug: string, preset?: string): {
  kind: string;
  title: string;
  fields: PolicyField[];
} {
  const kind = slugKind.get(slug);
  if (!kind) return { kind: slug, title: "", fields: [] };
  const presetRow = preset ? presets.get(preset) : undefined;
  const values = presetRow && presetRow.kind === kind ? presetRow.answers : undefined;
  return {
    kind,
    title: kindSlots[kind].title,
    fields: kindSlots[kind].slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      control: slot.control,
      value: values?.[slot.id] ?? "",
    })),
  };
}

export function draft(raw: unknown, plan: PolicyPlan):
  | {
      ok: true;
      kind: PolicyKind;
      title: string;
      text: string;
      html: string;
      markdown: Markdown;
    }
  | { ok: false; message: string } {
  const parsed = parsePolicy(raw);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const rendered = render(parsed.kind, parsed.values);
  const projected = project(plan, rendered.text);
  return { ok: true, kind: parsed.kind, title: rendered.title, ...projected };
}

export function hostedDocument(raw: unknown):
  | { ok: true; kind: PolicyKind; text: string }
  | { ok: false; message: string } {
  const parsed = parsePolicy(raw);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const rendered = render(parsed.kind, parsed.values);
  return { ok: true, kind: parsed.kind, text: rendered.text };
}
