import type { ToolCopy } from "../../lib/contract/types.ts";
import { cookieRefundLongTail } from "../legal/catalog.ts";

export const copy = {
  headline: "Cookie and refund policy generator",
  steps: [
    "Choose the cookie page or the refund page and fill in the short form.",
    "Read the draft under the buttons before you copy it.",
    "Copy the text for free. Download Markdown or PDF, or publish a link, on the legal plan.",
  ],
  faq: [
    {
      question: "How is a cookie policy different from a refund policy?",
      answer:
        "A cookie draft names a cookie, its purpose, and how long it lasts. A refund draft names a window, a method, and exceptions.",
    },
    {
      question: "Do cookie and refund share a plan?",
      answer: "Yes. Both use the legal plan. The free copy still adds made with plainden.",
    },
    {
      question: "Can I host both policies?",
      answer: "Yes. Each kind has its own public link. Publishing one does not replace the other.",
    },
    {
      question: "What if a character will not fit in the PDF?",
      answer: "The download stops and tells you to copy the text. The tool does not swap the character out.",
    },
    {
      question: "Does the public page check my plan?",
      answer: "No. Anyone with the link can read the last published text.",
    },
    {
      question: "Can I leave a field blank?",
      answer: "No. An empty answer is rejected, and text longer than 400 characters is rejected.",
    },
  ],
  longTail: cookieRefundLongTail,
} satisfies ToolCopy;
