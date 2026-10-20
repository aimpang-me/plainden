import type { ToolCopy } from "../../lib/contract/types";

export const copy = {
  headline: "Scaffold check",
  steps: [
    "Type a note and a count.",
    "Press Check.",
    "A count above 3 shows the upgrade link.",
  ],
  faq: [
    {
      question: "What does this page check?",
      answer: "It checks that a tool folder can render inside the shared page template.",
    },
    {
      question: "What is the free count?",
      answer: "The free plan allows a count of 3.",
    },
    {
      question: "What happens over the free count?",
      answer: "The page shows an upgrade link to pricing.",
    },
    {
      question: "Does the check save anything?",
      answer: "No. The note stays in the browser.",
    },
    {
      question: "Where do prices come from?",
      answer: "Prices come from the price catalog, keyed by priceLookupKey.",
    },
    {
      question: "Will this page stay up?",
      answer: "No. Remove tools/scaffold before the public launch.",
    },
  ],
  longTail: [
    {
      slug: "scaffold-check-count",
      title: "Scaffold count check",
      intro: "Start from a count and see whether the free plan allows it.",
      preset: "Count preset",
      faq: [{ question: "Which field is the count?", answer: "The field labeled Count." }],
    },
    {
      slug: "scaffold-check-note",
      title: "Scaffold note check",
      intro: "The note field is only a preview. It is not stored.",
      preset: "Note preset",
      faq: [{ question: "Is the note uploaded?", answer: "No. It stays on this page." }],
    },
    {
      slug: "scaffold-check-file",
      title: "Scaffold file check",
      intro: "You can attach a sample file name. The file is not uploaded.",
      faq: [{ question: "Where does the file go?", answer: "Nowhere. The page shows the file name only." }],
    },
    {
      slug: "scaffold-check-format",
      title: "Scaffold format check",
      intro: "Pick text or HTML. The preview names the format you picked.",
      faq: [{ question: "Does HTML render as a page?", answer: "No. It is a label in the preview." }],
    },
    {
      slug: "scaffold-check-limit",
      title: "Scaffold limit check",
      intro: "A count of 4 is over the free limit of 3.",
      preset: "Limit preset",
      faq: [{ question: "What count is blocked?", answer: "4 or more on the free plan." }],
    },
  ],
} satisfies ToolCopy;
