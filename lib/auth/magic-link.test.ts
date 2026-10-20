import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { getAuth } from "./server";

const dirs: string[] = [];

afterEach(async () => {
  delete process.env.DEV_MAIL_DIR;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_URL;
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("the test Turnstile token sends a magic link file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "plainden-auth-"));
  const mail = await mkdtemp(path.join(tmpdir(), "plainden-mail-"));
  dirs.push(dir, mail);
  process.env.PGLITE_DATA_DIR = dir;
  process.env.EMAIL_TRANSPORT = "file";
  process.env.DEV_MAIL_DIR = mail;
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.BETTER_AUTH_SECRET = "plainden-dev-secret-0123456789abcdef";
  process.env.BETTER_AUTH_URL = "http://127.0.0.1:3100";

  const auth = await getAuth();
  await auth.api.signInMagicLink({
    body: { email: "ada@example.com", callbackURL: "/account" },
    headers: new Headers({ "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" }),
  });

  const names = (await readdir(mail)).filter((name) => name.endsWith(".json"));
  expect(names).toHaveLength(1);
  const message = JSON.parse(await readFile(path.join(mail, names[0] ?? ""), "utf8")) as {
    to: string;
    magicLinkUrl: string;
  };
  expect(message.to).toBe("ada@example.com");
  expect(message.magicLinkUrl).toContain("/api/auth/magic-link/verify?token=");
  expect(message.magicLinkUrl).toContain("callbackURL=%2Faccount");
});
