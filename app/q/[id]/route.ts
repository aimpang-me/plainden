import { recordScan } from "@/tools/qr/saved";

export const instant = false;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const scan = await recordScan(id);
  if (!scan.ok) {
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: scan.targetUrl,
      "cache-control": "no-store",
      "x-plainden-scans": String(scan.scanCount),
    },
  });
}
