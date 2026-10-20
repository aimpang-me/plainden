import type { ToolCopy } from "../../lib/contract/types.ts";
import { legalLongTail } from "./catalog.ts";

export const copy = {
  headline: "Privacy and terms generator",
  steps: [
    "Name the business, the contact email, the website, and a jurisdiction.",
    "Read the draft under the buttons. Every draft says it is not legal advice.",
    "Copy the text or the HTML. Markdown, PDF, and a public link need the legal plan.",
  ],
  faq: [
    {
      question: "Is this legal advice?",
      answer: "No. Every draft says it is not legal advice. Have a lawyer read it before you rely on it.",
    },
    {
      question: "Which jurisdictions can I pick?",
      answer: "US, Canada, EU/UK, Australia, or Other.",
    },
    {
      question: "What does the free copy include?",
      answer: "The draft text or HTML, plus a line that says made with plainden.",
    },
    {
      question: "What does the legal plan add?",
      answer: "Markdown, a PDF, and a hosted link at a stable address.",
    },
    {
      question: "Does the hosted page stay up if I cancel?",
      answer: "The last published text stays public. A canceled plan cannot publish a new body.",
    },
    {
      question: "Can I publish more than one policy?",
      answer:
        "A signed-in legal plan can publish one privacy policy, one terms page, one cookie policy, and one refund policy. Each keeps its own link.",
    },
  ],
  longTail: legalLongTail,
} satisfies ToolCopy;
