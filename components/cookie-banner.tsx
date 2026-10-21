"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  storedCookieChoice,
  subscribeCookieChoice,
  writeCookieChoice,
  type CookieChoice,
} from "@/lib/privacy/cookie-choice";

export function CookieBanner() {
  const choice = useSyncExternalStore(subscribeCookieChoice, storedCookieChoice, () => null);
  if (choice) return null;

  function choose(next: CookieChoice) {
    writeCookieChoice(next);
  }

  return (
    <section aria-label="Cookies" className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-8 py-5 max-[800px]:px-5">
        <p className="max-w-2xl text-sm text-muted">
          plainden uses a cookie to keep you signed in. Optional cookies stay off unless you accept.
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="plain" onClick={() => choose("declined")}>
            Decline
          </Button>
          <Button type="button" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </section>
  );
}
