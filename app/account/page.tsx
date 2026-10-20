import { Suspense } from "react";
import { connection } from "next/server";
import { SignInForm } from "@/components/sign-in-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { signOut } from "./actions";

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
      <h1 className="mb-4 text-2xl">Account</h1>
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
