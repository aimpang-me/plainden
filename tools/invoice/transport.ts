export type InvoiceTransport = {
  save(body: unknown): Promise<unknown>;
  list(kind: "invoice" | "receipt"): Promise<unknown>;
  read(id: string): Promise<unknown>;
  remove(id: string): Promise<unknown>;
};

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export const invoiceTransport: InvoiceTransport = {
  async save(body) {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return readJson(response);
  },
  async list(kind) {
    const response = await fetch(`/api/invoices?kind=${kind}`);
    return readJson(response);
  },
  async read(id) {
    const response = await fetch(`/api/invoices/${id}`);
    return readJson(response);
  },
  async remove(id) {
    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    return readJson(response);
  },
};
