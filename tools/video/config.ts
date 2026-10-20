import type { ToolConfig } from "../../lib/contract/types";

const mb = 1024 * 1024;

export const config = {
  id: "video",
  name: "Video compressor",
  slugs: ["compress-video"],
  title: "Video compressor",
  description: "Compress a video to a Discord, WhatsApp, 720p, or 480p preset.",
  entitlementKey: "video",
  priceLookupKey: "plainden_video_month",
  limits: {
    free: { fileSize: 100 * mb },
    paid: { fileSize: 500 * mb },
  },
  seoPages: [
    "compress-video-for-discord",
    "compress-video-for-whatsapp",
    "compress-video-to-720p",
    "compress-video-to-480p",
    "compress-video-for-email",
  ],
} satisfies ToolConfig;
