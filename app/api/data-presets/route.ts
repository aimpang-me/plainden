import { clientAddress, takeRateLimit } from "@/lib/security/enforce-rate-limit";
import { originAllowed, parseJsonBody, readLimitedBody } from "@/lib/security/origin";
import { listSavedPresets, saveSavedPreset, toPresetResponse } from "@/tools/data/saved-presets";
import { requireUser } from "../invoices/require-user";

const bodyLimit = 16_384;

export async function GET(): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const presets = await listSavedPresets(gate.user.id);
  return Response.json({ ok: true, presets });
}

export async function POST(request: Request): Promise<Response> {
  const limited = await takeRateLimit("write", clientAddress(request.headers));
  if (limited) return limited;
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (!originAllowed(request)) {
    return Response.json({ error: "forbidden", message: "Cross-origin write refused." }, { status: 403 });
  }
  const body = await readLimitedBody(request, bodyLimit);
  if (!body.ok) return Response.json({ error: "too-large", message: "Request body is too large." }, { status: 413 });
  return toPresetResponse(await saveSavedPreset(gate.user.id, parseJsonBody(body.text)));
}
