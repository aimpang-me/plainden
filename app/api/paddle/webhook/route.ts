import { handleWebhook, PaymentsNotConfigured, WebhookSignatureError } from "@/lib/payments";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";
  try {
    const result = await handleWebhook({ rawBody, signature });
    return Response.json(result);
  } catch (error) {
    if (error instanceof PaymentsNotConfigured) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof WebhookSignatureError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
