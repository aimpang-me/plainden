import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { portalAction } from "@/app/pricing/actions";
import { PageHeading } from "@/components/page-heading";
import { SignInForm } from "@/components/sign-in-form";
import { Button } from "@/components/ui/button";
import { subscription, usage, user as userTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDb } from "@/lib/db/client";
import { canManageBilling, subscriptionGrantsAccess } from "@/lib/payments/access";
import { siteOrigin } from "@/lib/seo";
import { signOut } from "./actions";

export function generateMetadata(): Metadata {
  return {
    title: "Account",
    alternates: { canonical: `${siteOrigin()}/account` },
    robots: { index: false, follow: false },
  };
}

export const instant = false;

type AccountQuery = {
  checkout?: string | string[];
  billing?: string | string[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<AccountQuery> }) {
  const query = await searchParams;
  return (
    <Suspense fallback={<p>Loading account</p>}>
      <AccountBody query={query} />
    </Suspense>
  );
}

async function AccountBody({ query }: { query: AccountQuery }) {
  await connection();
  const current = await getCurrentUser();
  const billing = await loadBilling(current?.id ?? null);
  const notice = noticeFor(query, billing.plan);
  return (
    <>
      <PageHeading>Account</PageHeading>
      <div className="mt-6">
        {current ? (
          <div className="grid gap-4">
            <p>{current.email}</p>
            <p className="text-secondary">Plan</p>
            <p>{billing.plan}</p>
            {notice ? <p role="status">{notice}</p> : null}
            <div className="grid gap-2">
              <p>Usage</p>
              {billing.usage.length === 0 ? (
                <p className="text-sm text-secondary">No usage recorded.</p>
              ) : (
                <ul className="grid gap-1 text-sm text-secondary">
                  {billing.usage.map((row) => (
                    <li key={row.id}>{`${row.count} ${row.kind} on ${row.entitlementKey} for ${row.period}`}</li>
                  ))}
                </ul>
              )}
            </div>
            {billing.manage ? (
              <form action={portalAction}>
                <Button type="submit" variant="plain">
                  Manage billing
                </Button>
              </form>
            ) : null}
            <form action={signOut}>
              <Button type="submit" variant="plain">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <SignInForm />
        )}
      </div>
    </>
  );
}

async function loadBilling(userId: string | null): Promise<{
  plan: "Free" | "One tool" | "All tools";
  manage: boolean;
  usage: { id: string; count: number; kind: string; entitlementKey: string; period: string }[];
}> {
  if (!userId) return { plan: "Free", manage: false, usage: [] };
  const db = await getDb();
  const subs = await db.select().from(subscription).where(eq(subscription.userId, userId));
  const counts = await db
    .select({
      id: usage.id,
      count: usage.count,
      kind: usage.kind,
      entitlementKey: usage.entitlementKey,
      period: usage.period,
    })
    .from(usage)
    .where(eq(usage.userId, userId));
  const customers = await db.select({ providerCustomerId: userTable.providerCustomerId }).from(userTable).where(eq(userTable.id, userId));
  const now = new Date();
  const paid = subs.filter((row) => subscriptionGrantsAccess(row.status, row.currentPeriodEnd, now));
  const plan = paid.some((row) => row.entitlementKey === "all") ? "All tools" : paid.length > 0 ? "One tool" : "Free";
  const manage = Boolean(customers[0]?.providerCustomerId) && subs.some((row) => canManageBilling(row.status));
  return { plan, manage, usage: counts };
}

function noticeFor(query: AccountQuery, plan: string): string | null {
  const billing = first(query.billing);
  if (billing === "off") return "Checkout is turned off.";
  if (billing === "error") return "Billing could not be opened.";
  if (first(query.checkout) === "pending" && plan === "Free") return "Payment is pending. Your plan updates when the payment clears.";
  return null;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
