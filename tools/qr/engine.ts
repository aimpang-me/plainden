import QRCode from "qrcode";
import {
  asQrText,
  maxTextLength,
  parseTargetUrl,
  payloadKinds,
  type EncodeResult,
  type FieldSpec,
  type Format,
  type LogoDataUrl,
  type PayloadKind,
  type QrText,
} from "./contract";

export type PublishPolicy = "url-redirect" | "never";

export type KindView = {
  kind: PayloadKind;
  label: string;
  publish: PublishPolicy;
  fields: readonly FieldSpec[];
  defaults: Readonly<Record<string, string>>;
};

type Codec = KindView & {
  encode: (values: Readonly<Record<string, string>>) => EncodeResult;
};

const securityOptions = [
  { value: "WPA", label: "WPA" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "None" },
] as const;

const hiddenOptions = [
  { value: "no", label: "Visible" },
  { value: "yes", label: "Hidden" },
] as const;

function escapeWifi(value: string): string {
  return value.replace(/[\\;,:"']/g, (char) => `\\${char}`);
}

function escapeVcard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fail(reason: string): EncodeResult {
  return { ok: false, reason };
}

function ok(text: string): EncodeResult {
  return { ok: true, text: asQrText(text) };
}

function codecs(): Record<PayloadKind, Codec> {
  return {
    url: {
      kind: "url",
      label: "Link",
      publish: "url-redirect",
      fields: [{ name: "href", label: "Link", control: "text", options: null }],
      defaults: { href: "https://example.com" },
      encode(values) {
        const parsed = parseTargetUrl(values.href ?? "");
        if (!parsed.ok) return fail(parsed.reason);
        return ok(parsed.url);
      },
    },
    text: {
      kind: "text",
      label: "Text",
      publish: "never",
      fields: [{ name: "text", label: "Text", control: "text", options: null }],
      defaults: { text: "" },
      encode(values) {
        const text = (values.text ?? "").trim();
        if (!text) return fail("Text is empty.");
        if (text.length > maxTextLength) return fail(`Text must be ${maxTextLength} characters or fewer.`);
        return ok(text);
      },
    },
    wifi: {
      kind: "wifi",
      label: "Wi-Fi",
      publish: "never",
      fields: [
        { name: "ssid", label: "Network name", control: "text", options: null },
        { name: "password", label: "Password", control: "password", options: null },
        { name: "security", label: "Security", control: "select", options: securityOptions },
        { name: "hidden", label: "Hidden network", control: "select", options: hiddenOptions },
      ],
      defaults: { ssid: "", password: "", security: "WPA", hidden: "no" },
      encode(values) {
        const ssid = values.ssid ?? "";
        if (!ssid.trim()) return fail("Network name is empty.");
        const security = values.security ?? "";
        if (security !== "WPA" && security !== "WEP" && security !== "nopass") {
          return fail("Security must be WPA, WEP, or None.");
        }
        const password = values.password ?? "";
        if (security !== "nopass" && !password) return fail("Password is empty.");
        const hidden = values.hidden === "yes" ? "true" : "false";
        return ok(`WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden};;`);
      },
    },
    vcard: {
      kind: "vcard",
      label: "Contact",
      publish: "never",
      fields: [
        { name: "fullName", label: "Full name", control: "text", options: null },
        { name: "phone", label: "Phone", control: "text", options: null },
        { name: "email", label: "Email", control: "text", options: null },
        { name: "org", label: "Organization", control: "text", options: null },
        { name: "url", label: "Website", control: "text", options: null },
      ],
      defaults: { fullName: "", phone: "", email: "", org: "", url: "" },
      encode(values) {
        const fullName = (values.fullName ?? "").trim();
        if (!fullName) return fail("Full name is empty.");
        const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcard(fullName)}`];
        const phone = (values.phone ?? "").trim();
        const email = (values.email ?? "").trim();
        const org = (values.org ?? "").trim();
        const site = (values.url ?? "").trim();
        if (phone) lines.push(`TEL:${escapeVcard(phone)}`);
        if (email) lines.push(`EMAIL:${escapeVcard(email)}`);
        if (org) lines.push(`ORG:${escapeVcard(org)}`);
        if (site) {
          const parsed = parseTargetUrl(site);
          if (!parsed.ok) return fail(parsed.reason);
          lines.push(`URL:${parsed.url}`);
        }
        lines.push("END:VCARD");
        return ok(lines.join("\n"));
      },
    },
  };
}

export function kindViews(): readonly KindView[] {
  return payloadKinds.map((kind) => {
    const codec = codecs()[kind];
    return {
      kind: codec.kind,
      label: codec.label,
      publish: codec.publish,
      fields: codec.fields,
      defaults: codec.defaults,
    };
  });
}

export function payloadText(kind: PayloadKind, values: Readonly<Record<string, string>>): EncodeResult {
  return codecs()[kind].encode(values);
}

export function publishPolicy(kind: PayloadKind): PublishPolicy {
  return codecs()[kind].publish;
}

function injectLogo(svg: string, logo: string): string {
  const match = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg);
  const size = Number(match?.[1] ?? "");
  if (!Number.isFinite(size) || size <= 0) return svg;
  const box = size * 0.22;
  const origin = (size - box) / 2;
  const pad = box * 0.08;
  const href = logo.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const overlay = `<rect x="${origin - pad}" y="${origin - pad}" width="${box + pad * 2}" height="${box + pad * 2}" fill="#ffffff"/><image href="${href}" x="${origin}" y="${origin}" width="${box}" height="${box}"/>`;
  return svg.replace("</svg>", `${overlay}</svg>`);
}

export async function renderSvg(text: QrText, logo: LogoDataUrl | null): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: logo ? "H" : "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return logo ? injectLogo(svg, logo) : svg;
}

export async function renderPreview(input: {
  kind: PayloadKind;
  values: Readonly<Record<string, string>>;
  format: Format;
  logo: LogoDataUrl | null;
}): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; reason: string }> {
  const encoded = payloadText(input.kind, input.values);
  if (!encoded.ok) return encoded;
  if (input.format === "svg") {
    const svg = await renderSvg(encoded.text, input.logo);
    return { ok: true, blob: new Blob([svg], { type: "image/svg+xml" }), filename: "plainden-qr.svg" };
  }
  const dataUrl = await QRCode.toDataURL(encoded.text, {
    margin: 1,
    errorCorrectionLevel: "M",
    width: 512,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (char) => char.charCodeAt(0));
  return { ok: true, blob: new Blob([bytes], { type: "image/png" }), filename: "plainden-qr.png" };
}
