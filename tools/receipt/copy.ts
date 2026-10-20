import type { ToolCopy } from "../../lib/contract/types.ts";
import { receiptSlugs } from "./presets.ts";

export const copy = {
  headline: "Receipt generator",
  steps: [
    "Enter who was paid, who paid, a receipt number, and a payment method.",
    "Check the preview. A receipt shows a PAID stamp.",
    "Download the PDF. Receipt downloads count toward the same 3 free PDFs a month as invoices.",
  ],
  faq: [
    {
      question: "How is a receipt different from an invoice?",
      answer: "A receipt records a payment that already happened. It needs a payment method and shows a PAID stamp. It uses the same totals and PDF engine as the invoice generator.",
    },
    {
      question: "Which payment methods can I pick?",
      answer: "Cash, card, transfer, check, or other. Put extra detail in the notes.",
    },
    {
      question: "Does the free receipt have a footer?",
      answer: "Yes. Free PDFs include made with plainden. A paid invoice plan removes it.",
    },
    {
      question: "Do receipt downloads have their own monthly cap?",
      answer: "No. Invoice and receipt PDFs share one count of 3 free downloads a month in this browser.",
    },
    {
      question: "Can I save a receipt?",
      answer: "Saving uses the invoice plan, because a receipt is the same entitlement. It needs a signed-in account.",
    },
    {
      question: "Is this a tax receipt for a donation?",
      answer: "It can print the word donation and the amount. It is not a government form and it is not legal advice.",
    },
  ],
  longTail: [
    {
      slug: receiptSlugs.rent,
      title: "Rent receipt generator",
      intro: "A rent sample with a transfer payment and one rent line. Change the address in the notes if you need a unit number. The PDF is the receipt you hand to a tenant. It does not talk to a bank.",
      preset: receiptSlugs.rent,
      faq: [{ question: "Does this collect the rent?", answer: "No. It only writes the receipt." }],
    },
    {
      slug: receiptSlugs.cash,
      title: "Cash receipt template",
      intro: "A short cash sale with the method set to cash. Use it at a counter when you need a PDF instead of a handwritten slip. Count the cash yourself. This page does not open a drawer.",
      preset: receiptSlugs.cash,
      faq: [{ question: "Does it record the bills I received?", answer: "Only if you type that in the notes." }],
    },
    {
      slug: receiptSlugs.payment,
      title: "Payment receipt generator",
      intro: "A card payment sample that points at an invoice number in the line description. The preview stamp says PAID. Send the PDF when a client asks for proof that you received the money.",
      preset: receiptSlugs.payment,
      faq: [{ question: "Does the stamp mean the card was charged?", answer: "No. The stamp is text on the PDF. You record the payment yourself." }],
    },
    {
      slug: receiptSlugs.word,
      title: "Receipt template instead of Word",
      intro: "This sample has the fields of a Word receipt and downloads a PDF. You do not need a desktop word processor. The file is not a .docx.",
      preset: receiptSlugs.word,
      faq: [{ question: "Can I edit this in Word?", answer: "The download is a PDF, so edit the form on this page instead." }],
    },
    {
      slug: receiptSlugs.donation,
      title: "Donation receipt template",
      intro: "A donation sample with the method set to other and a single amount. Add your own acknowledgement in the notes. This is not a charitable tax form and it does not claim a deduction.",
      preset: receiptSlugs.donation,
      faq: [{ question: "Will a tax office accept this file?", answer: "That is outside this tool. It prints what you type and says it is not legal advice." }],
    },
  ],
} satisfies ToolCopy;
