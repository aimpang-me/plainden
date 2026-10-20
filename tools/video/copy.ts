import type { ToolCopy } from "../../lib/contract/types";

export const copy = {
  headline: "Video compressor",
  steps: [
    "Add one video file.",
    "Pick a preset. Discord targets 8 MB, WhatsApp targets 16 MB, and 720p or 480p change the height.",
    "Press Compress video and download the MP4. A free plan allows a 100 MB file.",
  ],
  faq: [
    {
      question: "Do my files get uploaded?",
      answer: "No. Compression runs in this browser.",
    },
    {
      question: "What is the free limit?",
      answer: "100 MB for one file.",
    },
    {
      question: "What does the paid plan change?",
      answer: "500 MB for one file.",
    },
    {
      question: "How small is the Discord preset?",
      answer: "It targets under 8 MB.",
    },
    {
      question: "How small is the WhatsApp preset?",
      answer: "It targets under 16 MB.",
    },
    {
      question: "Do 720p and 480p limit the file size?",
      answer: "No. They scale the height. A free file still has to start under 100 MB.",
    },
  ],
  longTail: [
    {
      slug: "compress-video-for-discord",
      title: "Compress a video for Discord",
      intro:
        "Discord uploads on a free account run out of room quickly. This page opens on an 8 MB target. Add a video, press Compress video, and download an MP4 aimed under that size.",
      preset: "discord",
      faq: [
        {
          question: "Does this page hand back a file over 8 MB?",
          answer: "No. If the encode cannot fit, the page says so and does not offer the download.",
        },
      ],
    },
    {
      slug: "compress-video-for-whatsapp",
      title: "Compress a video for WhatsApp",
      intro:
        "This page opens on a 16 MB target for a WhatsApp video message. The work stays on this device and the download is an MP4.",
      preset: "whatsapp",
      faq: [
        {
          question: "Why is the WhatsApp target 16 MB?",
          answer: "WhatsApp video messages have used a 16 MB cap. This preset aims under that size.",
        },
      ],
    },
    {
      slug: "compress-video-to-720p",
      title: "Compress a video to 720p",
      intro:
        "This page sets the height to 720 pixels when the source is taller, and leaves a shorter video at its own height. It does not aim at a byte size.",
      preset: "720p",
      faq: [
        {
          question: "Will a small video be stretched to 720p?",
          answer: "No. The scale uses the smaller of 720 and the current height.",
        },
      ],
    },
    {
      slug: "compress-video-to-480p",
      title: "Compress a video to 480p",
      intro:
        "This page sets the height to 480 pixels when the source is taller. Use it when 720p is more than you need. There is no byte-size promise on this preset.",
      preset: "480p",
      faq: [
        {
          question: "Is 480p a file-size cap?",
          answer: "No. It is only a height. The free plan still blocks a source over 100 MB.",
        },
      ],
    },
    {
      slug: "compress-video-for-email",
      title: "Compress a video for email",
      intro:
        "Many mailboxes reject a large attachment. This page opens on an 8 MB target so the MP4 is easier to attach. It uses the same size rule as the Discord preset.",
      preset: "discord",
      faq: [
        {
          question: "Is the email target different from Discord?",
          answer: "The size target is the same 8 MB. This page only changes the starting point.",
        },
      ],
    },
  ],
} satisfies ToolCopy;
