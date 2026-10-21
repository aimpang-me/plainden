import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookSignatureError } from "./errors";

const maxAgeSeconds = 5 * 60;

export function signPaddleWebhook(rawBody: string, secret: string, ts: number): string {
  const digest = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${digest}`;
}

export function assertPaddleSignature(rawBody: string, header: string, secret: string, nowMs = Date.now()): void {
  const ts = header.match(/(?:^|;)ts=(\d+)/)?.[1];
  const signatures = [...header.matchAll(/(?:^|;)h1=([0-9a-f]+)/gi)].map((match) => match[1] ?? "");
  if (!ts || signatures.length === 0) throw new WebhookSignatureError();
  if (Math.abs(nowMs / 1000 - Number(ts)) > maxAgeSeconds) throw new WebhookSignatureError();
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const matches = signatures.some((signature) => {
    const actual = Buffer.from(signature);
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
  if (!matches) throw new WebhookSignatureError();
}
