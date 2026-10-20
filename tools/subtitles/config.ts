import type { ToolConfig } from "../../lib/contract/types";

export const config = {
  id: "subtitles",
  name: "Subtitle converter",
  slugs: ["srt-to-vtt", "srt-converter"],
  title: "Subtitle converter",
  description: "Convert SRT, VTT, and ASS subtitles and shift their timing.",
  entitlementKey: "subtitles",
  priceLookupKey: "plainden_subtitles_month",
  limits: {
    free: { batchCount: 1 },
    paid: { batchCount: 50 },
  },
  seoPages: [
    "vtt-to-srt",
    "ass-to-srt",
    "ass-to-vtt",
    "shift-subtitle-timing",
    "fix-subtitle-encoding",
  ],
} satisfies ToolConfig;
