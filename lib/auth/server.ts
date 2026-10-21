import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { captcha, magicLink } from "better-auth/plugins";
import { account, session, user, verification } from "../../db/schema";
import { getDb } from "../db/client";
import { isProductionRuntime } from "../runtime";
import { sendMail } from "./send-mail";
import { sendWelcomeMail } from "./welcome";

const devSecret = "plainden-dev-secret-0123456789abcdef";
const turnstileTestSecret = "1x0000000000000000000000000000000AA";
export const magicLinkExpiresInSeconds = 15 * 60;

let authPromise: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
  if (!authPromise) {
    authPromise = createAuth().catch((error: unknown) => {
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}

async function createAuth() {
  const db = await getDb();
  const secret = authSecret();
  const baseURL = authBaseUrl();
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: trustedOriginsFor(baseURL),
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: false,
      camelCase: true,
      schema: { user, session, account, verification },
    }),
    advanced: {
      useSecureCookies: isProductionRuntime() || baseURL.startsWith("https://"),
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
    },
    rateLimit: { enabled: true, window: 60, max: 100 },
    emailAndPassword: { enabled: false },
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            await sendWelcomeMail(created.email);
          },
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: magicLinkExpiresInSeconds,
        rateLimit: { window: 60, max: 60 },
        sendMagicLink: async ({ email, url }) => {
          await sendMail({
            to: email,
            subject: "Sign in to plainden",
            text: `Sign in to plainden: ${url}`,
            magicLinkUrl: url,
          });
        },
      }),
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: turnstileSecret(),
        endpoints: ["/sign-in/magic-link"],
      }),
      nextCookies(),
    ],
  });
}

export function turnstileSecret(): string {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("TURNSTILE_SECRET_KEY is required");
  return turnstileTestSecret;
}

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required");
  return devSecret;
}

export function trustedOriginsFor(baseURL: string): string[] {
  if (isProductionRuntime()) return [trimOrigin(baseURL)];
  const port = process.env.PORT ?? "3100";
  return [...new Set([trimOrigin(baseURL), `http://localhost:${port}`, `http://127.0.0.1:${port}`])];
}

function trimOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

function authBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return configured;
  if (isProductionRuntime()) throw new Error("BETTER_AUTH_URL is required in production");
  const port = process.env.PORT ?? "3100";
  return `http://127.0.0.1:${port}`;
}
