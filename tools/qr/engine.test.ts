import { expect, test } from "vitest";
import { parseCommand, parseLogo, parseTargetUrl } from "./contract";
import { payloadText, renderPreview } from "./engine";

test("a link encodes as the https URL", () => {
  expect(payloadText("url", { href: "https://example.com" })).toEqual({
    ok: true,
    text: "https://example.com/",
  });
});

test("a javascript link is refused", () => {
  expect(payloadText("url", { href: "javascript:alert(1)" })).toEqual({
    ok: false,
    reason: "Link must be an http or https URL.",
  });
});

test("text is trimmed and empty text is refused", () => {
  expect(payloadText("text", { text: "  Hello  " })).toEqual({ ok: true, text: "Hello" });
  expect(payloadText("text", { text: "   " })).toEqual({ ok: false, reason: "Text is empty." });
});

test("wifi encodes the WPA string and escapes a semicolon", () => {
  expect(
    payloadText("wifi", { ssid: "Cafe", password: "secret", security: "WPA", hidden: "no" }),
  ).toEqual({ ok: true, text: "WIFI:T:WPA;S:Cafe;P:secret;H:false;;" });
  expect(
    payloadText("wifi", { ssid: "a;b", password: "x", security: "WPA", hidden: "yes" }),
  ).toEqual({ ok: true, text: "WIFI:T:WPA;S:a\\;b;P:x;H:true;;" });
});

test("a contact card keeps the name phone email and organization", () => {
  expect(
    payloadText("vcard", {
      fullName: "Ada Lovelace",
      phone: "+15555550100",
      email: "ada@example.com",
      org: "Plainden",
      url: "",
    }),
  ).toEqual({
    ok: true,
    text: "BEGIN:VCARD\nVERSION:3.0\nFN:Ada Lovelace\nTEL:+15555550100\nEMAIL:ada@example.com\nORG:Plainden\nEND:VCARD",
  });
});

test("png bytes start with the PNG signature and svg can carry a logo", async () => {
  const png = await renderPreview({
    kind: "url",
    values: { href: "https://example.com" },
    format: "png",
    logo: null,
  });
  expect(png.ok).toBe(true);
  if (!png.ok) return;
  const bytes = new Uint8Array(await png.blob.arrayBuffer());
  expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(png.filename).toBe("plainden-qr.png");

  const logo = parseLogo("data:image/png;base64,aaaa");
  expect(logo.ok).toBe(true);
  if (!logo.ok || !logo.logo) return;
  const svg = await renderPreview({
    kind: "url",
    values: { href: "https://example.com" },
    format: "svg",
    logo: logo.logo,
  });
  expect(svg.ok).toBe(true);
  if (!svg.ok) return;
  const markup = await svg.blob.text();
  expect(markup).toContain('href="data:image/png;base64,aaaa"');
  expect(markup).toContain("<svg");
});

test("a publish command rejects a bad link and accepts a real one", () => {
  expect(parseCommand({ type: "publish", targetUrl: "not a url", logo: null })).toEqual({
    ok: false,
    code: "invalid",
    reason: "Link must be an http or https URL.",
  });
  const parsed = parseTargetUrl("https://example.com/landed");
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.url).toBe("https://example.com/landed");
});
