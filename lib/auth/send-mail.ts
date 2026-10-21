import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { isProductionRuntime } from "../runtime";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  magicLinkUrl?: string;
};

export function assertMailConfigured(): "file" | "resend" {
  const transport = process.env.EMAIL_TRANSPORT ?? "file";
  if (transport !== "file" && transport !== "resend") {
    throw new Error("EMAIL_TRANSPORT must be file or resend");
  }
  if (isProductionRuntime()) {
    if (transport !== "resend") throw new Error("EMAIL_TRANSPORT=resend is required in production");
    senderAddress();
  }
  if (transport === "resend") senderAddress();
  return transport;
}

export function senderAddress(): string {
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  if (from.length === 0 || from.endsWith("@resend.dev") || from.includes("onboarding@resend.dev")) {
    throw new Error("EMAIL_FROM must be a configured sender");
  }
  return from;
}

export async function sendMail(message: OutboundMail): Promise<void> {
  const transport = assertMailConfigured();
  if (transport === "file") {
    const dir = process.env.DEV_MAIL_DIR ?? ".dev-mail";
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const body = {
      id,
      to: message.to,
      subject: message.subject,
      text: message.text,
      magicLinkUrl: message.magicLinkUrl ?? null,
      sentAt: new Date().toISOString(),
    };
    await writeFile(path.join(dir, `${id}.json`), `${JSON.stringify(body, null, 2)}\n`);
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is required");
  const resend = new Resend(key);
  await resend.emails.send({
    from: senderAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
