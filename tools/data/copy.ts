import type { ToolCopy } from "../../lib/contract/types";

export const copy = {
  headline: "CSV, JSON, and Excel converter",
  steps: [
    "Add a CSV, JSON, or Excel file.",
    "Press Convert and check the preview table.",
    "Download the result. A free plan allows 5 MB. A paid plan allows 100 MB and saved presets on this device.",
  ],
  faq: [
    {
      question: "Do my files get uploaded?",
      answer: "No. CSV, JSON, and Excel conversion runs in this browser.",
    },
    {
      question: "What is the free size limit?",
      answer: "5 MB for one file.",
    },
    {
      question: "What does the paid plan change?",
      answer: "100 MB for one file, and you can save conversion presets on this device.",
    },
    {
      question: "What JSON shapes can I convert?",
      answer:
        "An array of objects, or an array of arrays whose first row is the header. A single object becomes one row. Values must be text, numbers, booleans, or null.",
    },
    {
      question: "Which Excel files work?",
      answer: "xlsx and xls. The download is CSV. The default reads the first sheet.",
    },
    {
      question: "Where are saved presets stored?",
      answer: "On this device, in this browser. They are not uploaded. A free plan cannot save them.",
    },
  ],
  longTail: [
    {
      slug: "csv-to-json-objects",
      title: "Convert a CSV into JSON objects",
      intro:
        "This page turns a CSV into a JSON array of objects. The first row of the file becomes the keys. Convert the file, check the preview, and download the JSON.",
      preset: "objects",
      faq: [
        {
          question: "Does the first row become the keys?",
          answer: "Yes. Each later row becomes one object.",
        },
      ],
    },
    {
      slug: "semicolon-csv-to-json",
      title: "Convert a semicolon CSV into JSON",
      intro:
        "Some spreadsheets export CSV with semicolons between columns. This page sets the delimiter to semicolon and writes a JSON array of objects.",
      preset: "semicolon",
      faq: [
        {
          question: "Why would a CSV use semicolons?",
          answer: "Spreadsheets in regions that use a comma as the decimal mark often separate columns with semicolons.",
        },
      ],
    },
    {
      slug: "json-rows-to-csv",
      title: "Convert JSON rows into CSV",
      intro:
        "Use this page when the JSON file is an array of arrays. The first array is the header row. Each later array becomes one CSV row.",
      preset: "rows",
      faq: [
        {
          question: "What if my JSON is an array of objects?",
          answer: "Open JSON to CSV and leave the shape set to objects.",
        },
      ],
    },
    {
      slug: "excel-first-sheet-to-csv",
      title: "Convert the first Excel sheet to CSV",
      intro:
        "This page reads the first worksheet of an xlsx or xls file and downloads a CSV. Later sheets stay out of the download unless you switch the sheet control to all sheets.",
      preset: "first-sheet",
      faq: [
        {
          question: "Can I include every sheet?",
          answer: "Yes. Change Sheets to All sheets. The download then names each sheet above its rows.",
        },
      ],
    },
    {
      slug: "tab-separated-to-json",
      title: "Convert a tab-separated file into JSON",
      intro:
        "This page reads a tab-separated table from a csv file and writes a JSON array of objects. The first row becomes the keys.",
      preset: "tab",
      faq: [
        {
          question: "Does this page accept a txt file?",
          answer: "No. Rename the table to a csv file. The delimiter control is set to tab.",
        },
      ],
    },
  ],
} satisfies ToolCopy;
