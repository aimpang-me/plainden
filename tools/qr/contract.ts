export const payloadKinds = ["url", "text", "wifi", "vcard"] as const;
export type PayloadKind = (typeof payloadKinds)[number];

export type Format = "png" | "svg";
export type Intent = "download" | "publish";

declare const httpUrlBrand: unique symbol;
declare const logoBrand: unique symbol;
declare const codeIdBrand: unique symbol;
declare const qrTextBrand: unique symbol;

export type HttpUrl = string & { readonly [httpUrlBrand]: true };
export type LogoDataUrl = string & { readonly [logoBrand]: true };
export type CodeId = string & { readonly [codeIdBrand]: true };
export type QrText = string & { readonly [qrTextBrand]: true };

export const maxTargetLength = 2048;
export const maxTextLength = 800;
export const maxLogoLength = 200_000;
export const logoMimes = ["image/png", "image/jpeg", "image/webp"] as const;

export type FieldSpec = {
  name: string;
  label: string;
  control: "text" | "password" | "select";
  options: readonly { value: string; label: string }[] | null;
};

export type EncodeResult = { ok: true; text: QrText } | { ok: false; reason: string };

export type Actor = { id: string } | null;

export type Command =
  | { type: "list" }
  | { type: "publish"; targetUrl: HttpUrl; logo: LogoDataUrl | null }
  | { type: "replace"; id: CodeId; targetUrl: HttpUrl; logo: LogoDataUrl | null }
  | { type: "remove"; id: CodeId };

export type SavedCode = {
  id: CodeId;
  shortPath: string;
  targetUrl: HttpUrl;
  scanCount: number;
  logo: LogoDataUrl | null;
  createdAt: string;
};

export type HandleResult =
  | { ok: true; type: "list"; codes: readonly SavedCode[] }
  | { ok: true; type: "publish"; code: SavedCode }
  | { ok: true; type: "replace"; code: SavedCode }
  | { ok: true; type: "remove" }
  | { ok: false; code: "signed-out"; reason: string }
  | { ok: false; code: "over-cap"; reason: string }
  | { ok: false; code: "missing"; reason: string }
  | { ok: false; code: "invalid"; reason: string };

export type ParseResult = { ok: true; command: Command } | { ok: false; code: "invalid"; reason: string };

export type ScanResult = { ok: true; targetUrl: HttpUrl; scanCount: number } | { ok: false };

const codeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseTargetUrl(input: unknown): { ok: true; url: HttpUrl } | { ok: false; reason: string } {
  if (typeof input !== "string") return { ok: false, reason: "Link must be an http or https URL." };
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > maxTargetLength) {
    return { ok: false, reason: "Link must be an http or https URL." };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Link must be an http or https URL." };
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || !url.hostname) {
    return { ok: false, reason: "Link must be an http or https URL." };
  }
  return { ok: true, url: url.toString() as HttpUrl };
}

export function parseLogo(input: unknown): { ok: true; logo: LogoDataUrl | null } | { ok: false; reason: string } {
  if (input === null || input === undefined) return { ok: true, logo: null };
  if (typeof input !== "string" || input.length > maxLogoLength) {
    return { ok: false, reason: "Logo must be a PNG, JPEG, or WebP image under 200000 characters." };
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\s]+)$/i.exec(input);
  if (!match) return { ok: false, reason: "Logo must be a PNG, JPEG, or WebP image under 200000 characters." };
  const mime = match[1]?.toLowerCase();
  if (!mime || !logoMimes.includes(mime as (typeof logoMimes)[number])) {
    return { ok: false, reason: "Logo must be a PNG, JPEG, or WebP image under 200000 characters." };
  }
  return { ok: true, logo: input as LogoDataUrl };
}

export function parseCodeId(input: unknown): { ok: true; id: CodeId } | { ok: false; reason: string } {
  if (typeof input !== "string" || !codeIdPattern.test(input)) {
    return { ok: false, reason: "That code id is not valid." };
  }
  return { ok: true, id: input as CodeId };
}

export function parseCommand(input: unknown): ParseResult {
  if (!isRecord(input) || typeof input.type !== "string") {
    return { ok: false, code: "invalid", reason: "Command must include a type." };
  }
  switch (input.type) {
    case "list":
      return { ok: true, command: { type: "list" } };
    case "publish":
    case "replace": {
      const target = parseTargetUrl(input.targetUrl);
      if (!target.ok) return { ok: false, code: "invalid", reason: target.reason };
      const logo = parseLogo(input.logo);
      if (!logo.ok) return { ok: false, code: "invalid", reason: logo.reason };
      if (input.type === "publish") {
        return { ok: true, command: { type: "publish", targetUrl: target.url, logo: logo.logo } };
      }
      const id = parseCodeId(input.id);
      if (!id.ok) return { ok: false, code: "invalid", reason: id.reason };
      return { ok: true, command: { type: "replace", id: id.id, targetUrl: target.url, logo: logo.logo } };
    }
    case "remove": {
      const id = parseCodeId(input.id);
      if (!id.ok) return { ok: false, code: "invalid", reason: id.reason };
      return { ok: true, command: { type: "remove", id: id.id } };
    }
    default:
      return { ok: false, code: "invalid", reason: "Command must include a type." };
  }
}

export function asQrText(value: string): QrText {
  return value as QrText;
}

export function isPayloadKind(value: string): value is PayloadKind {
  return payloadKinds.some((kind) => kind === value);
}

export function isFormat(value: string): value is Format {
  return value === "png" || value === "svg";
}
