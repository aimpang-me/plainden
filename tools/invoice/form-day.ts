"use client";

import { useSyncExternalStore } from "react";
import { stableFormDate } from "./document";

const serverDay = stableFormDate.toISOString().slice(0, 10);
let clientDayCache: string | null = null;

function clientDay(): string {
  clientDayCache ??= new Date().toISOString().slice(0, 10);
  return clientDayCache;
}

function serverSnapshot(): string {
  return serverDay;
}

function subscribe(): () => void {
  return () => {};
}

export function useFormDay(): string {
  return useSyncExternalStore(subscribe, clientDay, serverSnapshot);
}

export function formClock(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}
