export const presets = {
  link: { kind: "url", intent: "download", values: { href: "https://example.com" } },
  note: { kind: "text", intent: "download", values: { text: "Ship the static code." } },
  wifi: {
    kind: "wifi",
    intent: "download",
    values: { ssid: "Cafe", password: "secret", security: "WPA", hidden: "no" },
  },
  card: {
    kind: "vcard",
    intent: "download",
    values: {
      fullName: "Ada Lovelace",
      phone: "+15555550100",
      email: "ada@example.com",
      org: "Plainden",
      url: "",
    },
  },
  dynamic: { kind: "url", intent: "publish", values: { href: "https://example.com" } },
} as const;

export type PresetKey = keyof typeof presets;

export function readPreset(preset: string | undefined) {
  if (!preset || !(preset in presets)) return undefined;
  return presets[preset as PresetKey];
}
