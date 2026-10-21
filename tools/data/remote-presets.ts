import { acceptedPreset, type SavedPreset } from "./presets";
import type { Options } from "./convert";

export type RemotePresets =
  | { ok: true; presets: readonly SavedPreset[] }
  | { ok: false; fallback: true }
  | { ok: false; fallback: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function presetsFromApi(body: unknown): readonly SavedPreset[] | null {
  if (!isRecord(body) || !Array.isArray(body.presets)) return null;
  const presets: SavedPreset[] = [];
  for (const item of body.presets) {
    if (!isRecord(item) || typeof item.name !== "string") return null;
    const accepted = acceptedPreset(item.name, item.options);
    if (!accepted.ok) return null;
    presets.push({ name: accepted.name, options: accepted.options });
  }
  return presets;
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function readRemotePresets(fetchImpl: typeof fetch = fetch): Promise<RemotePresets> {
  try {
    const response = await fetchImpl("/api/data-presets");
    if (!response.ok) return { ok: false, fallback: true };
    const presets = presetsFromApi(await readBody(response));
    if (!presets) return { ok: false, fallback: true };
    return { ok: true, presets };
  } catch {
    return { ok: false, fallback: true };
  }
}

async function writeRemote(
  fetchImpl: typeof fetch,
  method: "POST" | "DELETE",
  body: unknown,
): Promise<RemotePresets> {
  try {
    const response = await fetchImpl("/api/data-presets", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 400 || response.status === 403) {
      const payload = await readBody(response);
      const message = isRecord(payload) && typeof payload.message === "string" ? payload.message : "Could not save that preset.";
      return { ok: false, fallback: false, message };
    }
    if (!response.ok) return { ok: false, fallback: true };
    return readRemotePresets(fetchImpl);
  } catch {
    return { ok: false, fallback: true };
  }
}

export function saveRemotePreset(name: string, options: Options, fetchImpl: typeof fetch = fetch): Promise<RemotePresets> {
  return writeRemote(fetchImpl, "POST", { name, options });
}

export function deleteRemotePreset(name: string, fetchImpl: typeof fetch = fetch): Promise<RemotePresets> {
  return writeRemote(fetchImpl, "DELETE", { name });
}
