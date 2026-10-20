import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { SignInForm } from "@/components/sign-in-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
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

export default function AccountPage() {
  return (
    <Suspense fallback={<p>Loading account</p>}>
      <AccountBody />
    </Suspense>
  );
}

async function AccountBody() {
  await connection();
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="mb-8 text-center text-[56px] font-medium leading-[1.05] tracking-[-0.035em] max-[800px]:text-[38px]">
        Account
      </h1>
      {user ? (
        <div className="grid gap-3">
          <p>{user.email}</p>
          <form action={signOut}>
            <Button type="submit" variant="plain">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <SignInForm />
      )}
    </>
  );
}
