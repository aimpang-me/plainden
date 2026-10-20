import type { ToolCopy } from "../../lib/contract/types";
import { imageOps, opOrder } from "./engine.ts";

export const copy = {
  headline: "Image tools",
  steps: [
    "Add your images. HEIC and WebP to PNG have their own pages.",
    "Set the target, the size, or the format when this page asks for one.",
    "Download the new files. A free plan allows 10 images, and each file can be up to 10 MB.",
  ],
  faq: [
    {
      question: "Do my files leave this browser?",
      answer: "No. Compress, resize, and convert run in this browser.",
    },
    {
      question: "What is the free file limit?",
      answer: "The free plan allows 10 images at a time. Each file can be up to 10 MB. The cap is per file, and the tool does not add the batch together.",
    },
    {
      question: "What does the paid plan change?",
      answer: "The paid plan allows 100 images at a time, and each file can be up to 50 MB.",
    },
    {
      question: "Does compress hit a specific byte count?",
      answer: "No. Compress aims within 10% of the target and does not promise an exact byte count.",
    },
    {
      question: "What does the 20 KB page do?",
      answer: "That page compresses toward 20 KB. It is a file size target. Pixel size stays on the resize page.",
    },
    {
      question: "Which images can I add?",
      answer: "JPEG, PNG, and WebP work on compress, resize, and convert. The HEIC page accepts HEIC. The WebP page accepts WebP and writes PNG.",
    },
  ],
  longTail: opOrder.flatMap((op) => imageOps[op].longTail),
} satisfies ToolCopy;
