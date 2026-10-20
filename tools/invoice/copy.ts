import type { ToolCopy } from "../../lib/contract/types.ts";
import { invoiceSlugs } from "./presets.ts";

export const copy = {
  headline: "Invoice generator",
  steps: [
    "Enter your name, the client, and at least one line with a quantity and a price.",
    "Read the preview total. Tax is the percent you enter, applied to the subtotal.",
    "Download the PDF. A free browser can make 3 PDFs a month, and each file includes a small footer.",
  ],
  faq: [
    {
      question: "Is an invoice from this page legal advice?",
      answer: "No. You fill in the names and amounts yourself. Have a person read anything you send to a client.",
    },
    {
      question: "How many PDFs can I download for free?",
      answer: "Three a month in this browser. The counter is stored on your device and resets each UTC month. Invoice and receipt downloads share that count.",
    },
    {
      question: "What does the free PDF include?",
      answer: "A line that says made with plainden, and the plain template. A paid plan removes that line and can use the ruled or letter template.",
    },
    {
      question: "Can I save an invoice and open it later?",
      answer: "Saving is part of the invoice plan and needs a signed-in account. The free plan cannot store invoices.",
    },
    {
      question: "Which currencies can I use?",
      answer: "USD, CAD, EUR, GBP, and AUD. Amounts are calculated in cents, not floating point.",
    },
    {
      question: "Can I add a logo?",
      answer: "Yes on a paid plan. Use a PNG or JPEG up to 200 KB. The file is stored with the invoice as a data URL.",
    },
  ],
  longTail: [
    {
      slug: invoiceSlugs.canada,
      title: "Invoice generator for Canada",
      intro: "Start from a Canadian sample with CAD and a 5 percent tax on the subtotal. Change the names, then download the PDF. If you charge GST and PST separately, put the split in the notes. This page does not file anything with a tax office.",
      preset: invoiceSlugs.canada,
      faq: [{ question: "Does this file a GST return?", answer: "No. It only prints the tax percent you type onto the invoice." }],
    },
    {
      slug: invoiceSlugs.googleDocs,
      title: "Invoice template instead of a Google Doc",
      intro: "People search for an invoice they can copy into a Doc. This page fills the same kind of fields and downloads a PDF you can attach. It does not create a Google Doc or ask you to sign in to another site.",
      preset: invoiceSlugs.googleDocs,
      faq: [{ question: "Will this open in Google Docs?", answer: "No. The download is a PDF." }],
    },
    {
      slug: invoiceSlugs.word,
      title: "Invoice template instead of Word",
      intro: "A Word invoice is a fixed layout with your name, the client, and the lines. This sample uses those fields and writes a PDF. You do not need Word installed, and the file is not a .docx.",
      preset: invoiceSlugs.word,
      faq: [{ question: "Is the download a DOCX file?", answer: "No. It is a PDF." }],
    },
    {
      slug: invoiceSlugs.excel,
      title: "Invoice template instead of Excel",
      intro: "Spreadsheet invoices are popular because the total updates when a line changes. This page does that math in the browser and puts the same total on the PDF. It does not export an .xlsx file.",
      preset: invoiceSlugs.excel,
      faq: [{ question: "Can I download a spreadsheet?", answer: "No. The total is on the PDF and in the preview." }],
    },
    {
      slug: invoiceSlugs.freelance,
      title: "Freelance invoice template",
      intro: "A freelance sample with one design line, a client, and a number you can change. Use it when you need to bill a project without setting up accounting software. The free plan still adds the plainden footer.",
      preset: invoiceSlugs.freelance,
      faq: [{ question: "Does this connect to accounting software?", answer: "No. Download the PDF and send it yourself." }],
    },
  ],
} satisfies ToolCopy;
