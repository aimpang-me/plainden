export const cookieChoiceKey = "plainden-cookie-choice";

export type CookieChoice = "accepted" | "declined";

const listeners = new Set<() => void>();

export function readCookieChoice(raw: string | null): CookieChoice | null {
  if (raw === "accepted" || raw === "declined") return raw;
  return null;
}

export function subscribeCookieChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function storedCookieChoice(): CookieChoice | null {
  if (typeof window === "undefined") return null;
  return readCookieChoice(window.localStorage.getItem(cookieChoiceKey));
}

export function writeCookieChoice(choice: CookieChoice): void {
  window.localStorage.setItem(cookieChoiceKey, choice);
  for (const listener of listeners) listener();
}
