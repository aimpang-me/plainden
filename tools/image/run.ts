import { decideLimit } from "@/lib/entitlements/decide-limit";
import { beginImage, imageLimits, type ImageRun, type RunImageInput } from "./engine.ts";

export async function runImage(input: RunImageInput): Promise<ImageRun> {
  const begun = beginImage({
    op: input.op,
    preset: input.preset,
    values: input.values,
    fileCount: input.files.length,
  });
  if (!begun.ok) return begun;
  for (const file of input.files) {
    const decision = decideLimit({ plan: input.plan, limits: imageLimits, kind: "fileSize", amount: file.size });
    if (!decision.ok) return { ok: false, reason: decision.reason, limit: true };
  }
  const batch = decideLimit({
    plan: input.plan,
    limits: imageLimits,
    kind: "batchCount",
    amount: input.files.length,
  });
  if (!batch.ok) return { ok: false, reason: batch.reason, limit: true };
  const loaded: { name: string; bytes: Uint8Array }[] = [];
  for (const file of input.files) {
    try {
      loaded.push({ name: file.name, bytes: await file.read() });
    } catch {
      return { ok: false, reason: `${file.name} could not be read.`, limit: false };
    }
  }
  return begun.transform(loaded, begun.settings, input.encode);
}
