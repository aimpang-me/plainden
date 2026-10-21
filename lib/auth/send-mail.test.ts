import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { assertMailConfigured, sendMail } from "./send-mail";

const previous = {
  nodeEnv: process.env.NODE_ENV,
  phase: process.env.NEXT_PHASE,
  transport: process.env.EMAIL_TRANSPORT,
  from: process.env.EMAIL_FROM,
};

afterEach(() => {
  restore("NODE_ENV", previous.nodeEnv);
  restore("NEXT_PHASE", previous.phase);
  restore("EMAIL_TRANSPORT", previous.transport);
  restore("EMAIL_FROM", previous.from);
});

function restore(name: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[name];
  else env[name] = value;
}

test("production mail refuses the file transport and the Resend onboarding sender", () => {
  restore("NODE_ENV", "production");
  delete process.env.NEXT_PHASE;
  process.env.EMAIL_TRANSPORT = "file";
  expect(() => assertMailConfigured()).toThrow("EMAIL_TRANSPORT=resend is required in production");
  process.env.EMAIL_TRANSPORT = "resend";
  process.env.EMAIL_FROM = "plainden <onboarding@resend.dev>";
  expect(() => assertMailConfigured()).toThrow("EMAIL_FROM must be a configured sender");
  process.env.EMAIL_FROM = "plainden <hello@plainden.com>";
  expect(assertMailConfigured()).toBe("resend");
});

test("a file message keeps the magic link for local sign-in", async () => {
  restore("NODE_ENV", "test");
  process.env.EMAIL_TRANSPORT = "file";
  const dir = `.dev-mail-unit-${Date.now()}`;
  process.env.DEV_MAIL_DIR = dir;
  await sendMail({
    to: "ada@example.com",
    subject: "Sign in to plainden",
    text: "Sign in to plainden: https://example.test/magic",
    magicLinkUrl: "https://example.test/magic",
  });
  const names = await readdir(dir);
  const message = JSON.parse(await readFile(join(dir, names[0] ?? ""), "utf8")) as { magicLinkUrl: string };
  expect(message.magicLinkUrl).toBe("https://example.test/magic");
  await rm(dir, { recursive: true, force: true });
  delete process.env.DEV_MAIL_DIR;
});
