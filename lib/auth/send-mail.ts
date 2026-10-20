import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  magicLinkUrl: string;
};

export async function sendMail(message: OutboundMail): Promise<void> {
  const transport = process.env.EMAIL_TRANSPORT ?? "file";
  if (transport === "file") {
    const dir = process.env.DEV_MAIL_DIR ?? ".dev-mail";
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const body = {
      id,
      to: message.to,
      subject: message.subject,
      text: message.text,
      magicLinkUrl: message.magicLinkUrl,
      sentAt: new Date().toISOString(),
    };
    await writeFile(path.join(dir, `${id}.json`), `${JSON.stringify(body, null, 2)}\n`);
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is required");
  const resend = new Resend(key);
  await resend.emails.send({
    from: "plainden <onboarding@resend.dev>",
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
