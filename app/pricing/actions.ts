"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createCheckout, createPortal } from "@/lib/payments";

export async function checkoutAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const priceLookupKey = String(formData.get("lookupKey") ?? "");
  const session = await createCheckout({
    priceLookupKey,
    subject: { userId: user.id },
    successPath: "/account",
    cancelPath: "/pricing",
  });
  redirect(session.url);
}

export async function portalAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/account");
  const session = await createPortal({
    subject: { userId: user.id },
    returnPath: "/account",
  });
  redirect(session.url);
}
