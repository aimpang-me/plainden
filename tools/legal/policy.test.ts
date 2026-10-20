import { expect, test } from "vitest";
import {
  ATTRIBUTION,
  NOTICE,
  cookieRefundLongTail,
  draft,
  hostedDocument,
  legalLongTail,
  questionnaire,
} from "./catalog";

const PLAN_MESSAGE = "Markdown and PDF need the legal plan.";
const BANNED = /GDPR|CCPA/;

const appAnswers = {
  businessName: "Northwind Apps",
  contactEmail: "privacy@northwind.example",
  website: "https://northwind.example",
  jurisdiction: "US",
  dataCollected: "account email and crash logs",
  purpose: "to run the app and fix crashes",
  retention: "18 months after the account closes",
};

const appText = [
  "Privacy policy",
  NOTICE,
  "Business name\nThis service is run by Northwind Apps.",
  "Contact email\nContact privacy@northwind.example about this policy.",
  "Website\nThe website is https://northwind.example.",
  "Jurisdiction\nThe operator points at US for this draft.",
  "Data collected\nThe data collected is account email and crash logs.",
  "Purpose\nThe purpose is to run the app and fix crashes.",
  "Retention\nThe data is kept for 18 months after the account closes.",
].join("\n\n");

const tails: { slug: string; kind: string; title: string; answers: Record<string, string> }[] = [
  { slug: "privacy-policy-generator-for-app", kind: "privacy", title: "Privacy policy", answers: appAnswers },
  {
    slug: "privacy-policy-generator-for-meta-ads",
    kind: "privacy",
    title: "Privacy policy",
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
    slug: "privacy-policy-generator-for-blogger",
    kind: "privacy",
    title: "Privacy policy",
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
    slug: "terms-and-conditions-generator-for-saas",
    kind: "terms",
    title: "Terms and conditions",
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
    slug: "terms-and-conditions-generator-for-marketplace",
    kind: "terms",
    title: "Terms and conditions",
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
  {
    slug: "cookie-policy-generator-for-shop",
    kind: "cookie",
    title: "Cookie policy",
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
    slug: "cookie-policy-generator-for-analytics",
    kind: "cookie",
    title: "Cookie policy",
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
    slug: "cookie-policy-generator-for-app",
    kind: "cookie",
    title: "Cookie policy",
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
    slug: "refund-policy-generator-for-digital-goods",
    kind: "refund",
    title: "Refund policy",
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
    slug: "refund-policy-generator-for-services",
    kind: "refund",
    title: "Refund policy",
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

function decodeHtml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function requireDraft(slug: string, plan: "free" | "paid", answers: Record<string, string>) {
  const result = draft({ kind: tails.find((tail) => tail.slug === slug)?.kind, answers }, plan);
  expect(result.ok, slug).toBe(true);
  if (!result.ok) throw new Error(`${slug} draft returned ${result.message}`);
  return result;
}

test("primary slugs select the kind and an unknown preset stays blank", () => {
  expect(questionnaire("privacy-policy-generator", "not-a-preset")).toEqual({
    kind: "privacy",
    title: "Privacy policy",
    fields: [
      { id: "businessName", label: "Business name", control: "text", value: "" },
      { id: "contactEmail", label: "Contact email", control: "text", value: "" },
      { id: "website", label: "Website", control: "text", value: "" },
      { id: "jurisdiction", label: "Jurisdiction", control: "jurisdiction", value: "" },
      { id: "dataCollected", label: "Data collected", control: "text", value: "" },
      { id: "purpose", label: "Purpose", control: "text", value: "" },
      { id: "retention", label: "Retention", control: "text", value: "" },
    ],
  });
  expect(questionnaire("terms-and-conditions-generator").kind).toBe("terms");
  expect(questionnaire("cookie-policy-generator").kind).toBe("cookie");
  expect(questionnaire("refund-policy-generator").kind).toBe("refund");
  expect(questionnaire("terms-and-conditions-generator").title).toBe("Terms and conditions");
  expect(questionnaire("cookie-policy-generator").title).toBe("Cookie policy");
  expect(questionnaire("refund-policy-generator").title).toBe("Refund policy");
});

test("tail presets fill the form and land in the paid, hosted, and decoded text", () => {
  const pages = [...legalLongTail, ...cookieRefundLongTail];
  expect(pages.map((page) => page.slug)).toEqual(tails.map((tail) => tail.slug));
  const intros = new Set<string>();
  for (const page of pages) {
    expect(page.preset).toBe(page.slug);
    expect(page.faq).toHaveLength(1);
    expect(page.intro.split(".").filter((sentence) => sentence.trim().length > 0).length).toBeGreaterThanOrEqual(2);
    intros.add(page.intro);
    expect(page.title).not.toMatch(BANNED);
    expect(page.intro).not.toMatch(BANNED);
    expect(page.faq[0]?.question).not.toMatch(BANNED);
    expect(page.faq[0]?.answer).not.toMatch(BANNED);
  }
  expect(intros.size).toBe(pages.length);
  expect(NOTICE).not.toMatch(BANNED);
  expect(ATTRIBUTION).not.toMatch(BANNED);

  for (const tail of tails) {
    const form = questionnaire(tail.slug, tail.slug);
    expect(form).toMatchObject({ kind: tail.kind, title: tail.title });
    expect(form.fields.map((field) => [field.id, field.value])).toEqual(Object.entries(tail.answers));
    for (const value of Object.values(tail.answers)) {
      expect(value.trim().toLowerCase()).not.toBe("answer");
    }
    const paid = requireDraft(tail.slug, "paid", tail.answers);
    const free = requireDraft(tail.slug, "free", tail.answers);
    const hosted = hostedDocument({ kind: tail.kind, answers: tail.answers });
    expect(hosted).toEqual({ ok: true, kind: tail.kind, text: paid.text });
    expect(paid.text.startsWith(`${tail.title}\n\n${NOTICE}\n\n`)).toBe(true);
    expect(paid.text.includes(ATTRIBUTION)).toBe(false);
    expect(paid.html.includes(ATTRIBUTION)).toBe(false);
    expect(free.text).toBe(`${paid.text}\n\n${ATTRIBUTION}`);
    expect(free.html.endsWith(`\n\n${ATTRIBUTION}`)).toBe(true);
    expect(free.markdown).toEqual({ ok: false, error: "plan", message: PLAN_MESSAGE });
    expect(JSON.stringify(free.markdown).includes(tail.answers.businessName ?? "")).toBe(false);
    expect(paid.markdown).toEqual({ ok: true, text: `# ${paid.text}` });
    const decoded = decodeHtml(paid.html);
    let authored = `${paid.text}\n${paid.title}\n${NOTICE}\n${ATTRIBUTION}`;
    const values = Object.values(tail.answers).sort((left, right) => right.length - left.length);
    for (const value of values) {
      expect(paid.text.includes(value)).toBe(true);
      expect(hosted.ok && hosted.text.includes(value)).toBe(true);
      expect(decoded.includes(value)).toBe(true);
      authored = authored.replaceAll(value, "");
    }
    expect(authored).not.toMatch(BANNED);
  }
});

test("the app sample is the clause text, and A & B <C> stays raw in text and escaped in HTML", () => {
  const paid = draft({ kind: "privacy", answers: appAnswers }, "paid");
  expect(paid).toEqual({
    ok: true,
    kind: "privacy",
    title: "Privacy policy",
    text: appText,
    html: escapeExpected(appText),
    markdown: { ok: true, text: `# ${appText}` },
  });
  const marked = {
    ...appAnswers,
    businessName: `A & B <C> "D"`,
    contactEmail: "o'brien@example.com",
  };
  const special = draft({ kind: "privacy", answers: marked }, "paid");
  const specialFree = draft({ kind: "privacy", answers: marked }, "free");
  expect(special.ok).toBe(true);
  if (!special.ok) throw new Error("special draft missing");
  expect(specialFree.ok).toBe(true);
  if (!specialFree.ok) throw new Error("special free draft missing");
  expect(special.text.includes(`A & B <C> "D"`)).toBe(true);
  expect(special.text.includes("o'brien@example.com")).toBe(true);
  expect(special.html.includes(`A &amp; B &lt;C&gt; &quot;D&quot;`)).toBe(true);
  expect(special.html.includes("o&#39;brien@example.com")).toBe(true);
  expect(special.html.includes(`A & B <C>`)).toBe(false);
  expect(decodeHtml(special.html).includes(`A & B <C> "D"`)).toBe(true);
  expect(specialFree.text.endsWith(`\n\n${ATTRIBUTION}`)).toBe(true);
  expect(specialFree.html.endsWith(`\n\n${ATTRIBUTION}`)).toBe(true);
  expect(special.text.includes(ATTRIBUTION)).toBe(false);
  expect(special.html.includes(ATTRIBUTION)).toBe(false);
  expect(specialFree.markdown).toEqual({ ok: false, error: "plan", message: PLAN_MESSAGE });
  expect(JSON.stringify(specialFree.markdown).includes("A & B")).toBe(false);
  const hosted = hostedDocument({ kind: "privacy", answers: marked });
  expect(hosted).toEqual({ ok: true, kind: "privacy", text: special.text });
});

test("the first parse failure is the message and a failure has no markdown", () => {
  const base = { ...appAnswers };
  expect(draft({ kind: "nope", answers: base }, "free")).toEqual({ ok: false, message: "Unknown kind." });
  expect(draft({ answers: base }, "paid")).toEqual({ ok: false, message: "Unknown kind." });
  expect(hostedDocument(null)).toEqual({ ok: false, message: "Unknown kind." });
  expect("markdown" in draft({ kind: "privacy" }, "free")).toBe(false);
  expect(draft({ kind: "privacy" }, "paid")).toEqual({ ok: false, message: "Missing answers." });
  expect(draft({ kind: "privacy", answers: null }, "paid")).toEqual({ ok: false, message: "Missing answers." });
  expect(draft({ kind: "privacy", answers: { ...base, businessName: 4, bonus: "x" } }, "paid")).toEqual({
    ok: false,
    message: "Missing answers.",
  });
  expect(draft({ kind: "privacy", answers: { ...base, businessName: "  ", bonus: "x" } }, "paid")).toEqual({
    ok: false,
    message: "Unknown key bonus.",
  });
  expect(
    draft(
      { kind: "privacy", answers: { ...base, businessName: "   ", jurisdiction: "Mars", dataCollected: "x".repeat(401) } },
      "paid",
    ),
  ).toEqual({ ok: false, message: "Empty answer." });
  expect(draft({ kind: "privacy", answers: { ...base, purpose: "y".repeat(401), jurisdiction: "Mars" } }, "free")).toEqual({
    ok: false,
    message: "Answer is over 400 characters.",
  });
  expect(draft({ kind: "privacy", answers: { ...base, jurisdiction: "us" } }, "paid")).toEqual({
    ok: false,
    message: "Jurisdiction must be US, Canada, EU/UK, Australia, or Other.",
  });
  const trimmed = draft({ kind: "privacy", answers: { ...base, businessName: "  Ada  ", jurisdiction: " Canada " } }, "paid");
  expect(trimmed.ok).toBe(true);
  if (!trimmed.ok) throw new Error("trimmed draft missing");
  expect(trimmed.text.includes("This service is run by Ada.")).toBe(true);
  expect(trimmed.text.includes("  Ada")).toBe(false);
  expect(trimmed.text.includes("The operator points at Canada for this draft.")).toBe(true);
  const exact = draft({ kind: "privacy", answers: { ...base, businessName: "a".repeat(400) } }, "paid");
  expect(exact.ok).toBe(true);
  if (!exact.ok) throw new Error("400 character draft missing");
  expect(exact.text.includes("a".repeat(400))).toBe(true);
});

function escapeExpected(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
