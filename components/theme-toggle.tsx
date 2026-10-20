"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(onStoreChange: () => void) {
  document.documentElement.dataset.hydrated = "true";
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function serverTheme(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("plainden-theme", next);
  }

  const label = theme === "dark" ? "Switch to light" : "Switch to dark";
  return (
    <button type="button" className="inline-flex h-12 items-center text-sm text-ink" onClick={toggle} aria-pressed={theme === "dark"}>
      {label}
    </button>
  );
}
