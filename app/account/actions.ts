"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type MagicLinkResult = { ok: true } | { ok: false; error: string };

export async function requestMagicLink(email: string, turnstileToken: string): Promise<MagicLinkResult> {
  if (!email.includes("@") || turnstileToken.length === 0) {
    return { ok: false, error: "Enter an email and complete the check." };
  }
  try {
    const headerList = new Headers(await headers());
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
