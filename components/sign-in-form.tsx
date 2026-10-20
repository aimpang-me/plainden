"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { requestMagicLink } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const testSiteKey = "1x00000000000000000000AA";
const dummyToken = "XXXX.DUMMY.TOKEN.XXXX";

type TurnstileApi = {
  render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => void;
};

export function SignInForm() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [token, setToken] = useState(siteKey === testSiteKey ? dummyToken : "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const widget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = widget.current;
    if (!node || !siteKey) return;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = () => {
      const turnstile = readTurnstile(window);
      turnstile?.render(node, { sitekey: siteKey, callback: setToken });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [siteKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    const result = await requestMagicLink(email, token);
    setPending(false);
    setMessage(result.ok ? "Check your email for a sign-in link." : result.error);
  }

  return (
    <form className="mx-auto grid w-full max-w-sm gap-4" onSubmit={onSubmit}>
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <div ref={widget} />
      <Button type="submit" className="w-full" disabled={pending || token.length === 0}>
        Email me a sign-in link
      </Button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}

function readTurnstile(target: Window): TurnstileApi | null {
  const candidate: unknown = Reflect.get(target, "turnstile");
  if (!candidate || typeof candidate !== "object" || !("render" in candidate)) return null;
  const render: unknown = candidate.render;
  if (typeof render !== "function") return null;
  return {
    render: (element, options) => {
      render(element, options);
    },
  };
}
