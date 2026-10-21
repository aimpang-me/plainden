"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isEmailAddress } from "@/lib/auth/email";
import { getAuth } from "@/lib/auth/server";
import { takeSignInLimit } from "@/lib/security/enforce-rate-limit";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

export async function requestMagicLink(email: string, turnstileToken: string): Promise<MagicLinkResult> {
  const headerList = new Headers(await headers());
  const limited = await takeSignInLimit(headerList, email);
  if (limited) return { ok: false, error: "Too many sign-in attempts. Try again later." };
  if (!isEmailAddress(email) || turnstileToken.length === 0) {
    return { ok: false, error: "Enter an email and complete the check." };
  }
  try {
    headerList.set("x-captcha-response", turnstileToken);
    const auth = await getAuth();
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/account" },
      headers: headerList,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send the sign-in link." };
  }
}

export async function signOut(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  redirect("/account");
}
