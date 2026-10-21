"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createCheckout, createPortal } from "@/lib/payments";

export type CheckoutActionResult = { transactionId: string; email: string } | { error: string };

export async function checkoutAction(formData: FormData): Promise<CheckoutActionResult> {
  const current = await getCurrentUser();
  if (!current) redirect("/account");
  try {
    const checkout = await createCheckout({
      priceLookupKey: String(formData.get("lookupKey") ?? ""),
      subject: { userId: current.id },
      successPath: "/account?checkout=pending",
      cancelPath: "/pricing",
    });
    return { transactionId: checkout.transactionId, email: current.email };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error && error.message) return { error: error.message };
    return { error: "Checkout could not start." };
  }
}

export async function portalAction(): Promise<void> {
  const current = await getCurrentUser();
  if (!current) redirect("/account");
  try {
    const session = await createPortal({
      subject: { userId: current.id },
      returnPath: "/account",
    });
    redirect(session.url);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error && error.message === "Checkout is turned off.") redirect("/account?billing=off");
    redirect("/account?billing=error");
  }
}
