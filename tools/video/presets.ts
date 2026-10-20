export type BudgetPreset = {
  kind: "budget";
  id: "discord" | "whatsapp";
  label: string;
  maxBytes: number;
  maxHeight: number;
};

export type ScalePreset = {
  kind: "scale";
  id: "720p" | "480p";
  label: string;
  maxHeight: number;
};

export type VideoPreset = BudgetPreset | ScalePreset;

const mb = 1024 * 1024;

export const presets = [
  { kind: "budget", id: "discord", label: "Discord 8 MB", maxBytes: 8 * mb, maxHeight: 720 },
  { kind: "budget", id: "whatsapp", label: "WhatsApp 16 MB", maxBytes: 16 * mb, maxHeight: 720 },
  { kind: "scale", id: "720p", label: "720p", maxHeight: 720 },
  { kind: "scale", id: "480p", label: "480p", maxHeight: 480 },
] as const satisfies readonly VideoPreset[];

export function presetById(id: string | undefined): VideoPreset | undefined {
  return presets.find((preset) => preset.id === id);
}

export function initialPresetId(id: string | undefined): VideoPreset["id"] {
  return presetById(id)?.id ?? "discord";
}

const notes: Record<string, string> = {
  "compress-video-for-discord": "This page starts on the Discord preset. The target is under 8 MB.",
  "compress-video-for-whatsapp": "This page starts on the WhatsApp preset. The target is under 16 MB.",
  "compress-video-to-720p": "This page scales the height toward 720p. It does not promise a file size.",
  "compress-video-to-480p": "This page scales the height toward 480p. It does not promise a file size.",
  "compress-video-for-email": "This page starts on the 8 MB target used for a typical email attachment.",
};

export function pageNote(slug: string): string | null {
  return notes[slug] ?? null;
}
