import type { ToolCopy } from "../../lib/contract/types";

export const copy = {
  headline: "PDF tools",
  steps: [
    "Add a PDF or a JPG file.",
    "Press the button for this page.",
    "Download the new file. A free plan allows 25 MB and 5 runs a day.",
  ],
  faq: [
    {
      question: "Do my files get uploaded?",
      answer: "No. Merge, split, compress, and JPG to PDF run in this browser.",
    },
    {
      question: "What is the free limit?",
      answer: "25 MB on one run, and 5 runs a day on this device.",
    },
    {
      question: "What does the paid plan change?",
      answer: "200 MB on one run, and the daily cap is removed.",
    },
    {
      question: "Will compress make the PDF smaller?",
      answer: "It recompresses JPEG photos inside the PDF and leaves everything else alone. There is no size promise.",
    },
    {
      question: "How do I split out certain pages?",
      answer: "Type a range such as 1-2,4. Leave the range empty to make one PDF per page.",
    },
    {
      question: "Which images can become a PDF?",
      answer: "JPG files. PNG and HEIC stay on the image tools.",
    },
  ],
  longTail: [
    {
      slug: "compress-pdf-to-4mb",
      title: "Compress a PDF toward 4 MB",
      intro:
        "Use this page when a photo PDF is larger than you wanted. The tool recompresses JPEG photos already inside the file. The goal is up to 4 MB, and the page does not promise a 4 MB file.",
      preset: "4mb",
      faq: [
        {
          question: "Does this page guarantee a 4 MB PDF?",
          answer: "No. It aims for up to 4 MB and leaves non-JPEG content unchanged.",
        },
      ],
    },
    {
      slug: "merge-pdf-files",
      title: "Merge PDF files",
      intro: "Add two or more PDFs. The merged file keeps the page order you added.",
      preset: "two",
      faq: [
        {
          question: "Can I merge a single PDF?",
          answer: "No. Merge needs at least two PDF files.",
        },
      ],
    },
    {
      slug: "split-pdf-pages",
      title: "Split PDF pages",
      intro: "Start from page 1, or type a range. An empty range makes one PDF per page.",
      preset: "1",
      faq: [
        {
          question: "Are page numbers 1-based?",
          answer: "Yes. Page 1 is the first page of the file.",
        },
      ],
    },
    {
      slug: "jpg-to-pdf-photos",
      title: "Turn JPG photos into a PDF",
      intro: "Each JPG you add becomes one page, in the order you added the files.",
      preset: "photos",
      faq: [
        {
          question: "Can I add a PNG here?",
          answer: "No. This page accepts JPG files only.",
        },
      ],
    },
    {
      slug: "compress-pdf-scans",
      title: "Compress JPEG scans in a PDF",
      intro: "Scans stored as JPEG photos can be recompressed. Text and other images stay as they are.",
      preset: "scans",
      faq: [
        {
          question: "What is left untouched?",
          answer: "Anything that is not a JPEG photo inside the PDF.",
        },
      ],
    },
  ],
} satisfies ToolCopy;
