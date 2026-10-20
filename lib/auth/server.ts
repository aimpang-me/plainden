import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { captcha, magicLink } from "better-auth/plugins";
import { account, session, user, verification } from "../../db/schema";
import { getDb } from "../db/client";
import { sendMail } from "./send-mail";

const devSecret = "plainden-dev-secret-0123456789abcdef";
const turnstileTestSecret = "1x0000000000000000000000000000000AA";

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
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? turnstileTestSecret;
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [baseURL, "http://localhost:3100", "http://127.0.0.1:3100"],
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: false,
      camelCase: true,
      schema: { user, session, account, verification },
    }),
    advanced: { useSecureCookies: baseURL.startsWith("https://") },
    emailAndPassword: { enabled: false },
    plugins: [
      magicLink({
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
        secretKey: turnstileSecret,
        endpoints: ["/sign-in/magic-link"],
      }),
      nextCookies(),
    ],
  });
}

function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is required");
  return devSecret;
}

function authBaseUrl(): string {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return configured;
  const port = process.env.PORT ?? "3100";
  return `http://127.0.0.1:${port}`;
}
