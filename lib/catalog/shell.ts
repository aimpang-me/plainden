import type { ToolConfig } from "../contract/types";
import { plannedTools } from "./planned";
import { disabledToolIds } from "./visibility";

export const shellToolOrder = [
  "invoice",
  "receipt",
  "legal",
  "pdf",
  "qr",
  "image",
  "video",
  "data",
  "subtitles",
  "cookie-refund",
] as const;

export type ShellToolId = (typeof shellToolOrder)[number];

export type ShellTool = {
  id: ShellToolId;
  href: string;
  label: string;
  name: string;
  description: string;
  slugs: readonly string[];
};

const shellLabels: Record<ShellToolId, string> = {
  invoice: "Invoice generator",
  receipt: "Receipt maker",
  legal: "Privacy and terms",
  pdf: "PDF tools",
  qr: "QR code",
  image: "Image tools",
  video: "Video compressor",
  data: "Data converter",
  subtitles: "Subtitles",
  "cookie-refund": "Cookie and refund",
};

export function shellTools(raw?: string): ShellTool[] {
  const hidden = new Set(disabledToolIds(raw));
  const byId = new Map(plannedTools.map((tool) => [tool.id, tool]));
  return shellToolOrder.flatMap((id) => {
    if (hidden.has(id)) return [];
    const tool: ToolConfig | undefined = byId.get(id);
    if (!tool) return [];
    return [
      {
        id,
        href: `/${tool.slugs[0]}`,
        label: shellLabels[id],
        name: tool.name,
        description: tool.description,
        slugs: tool.slugs,
      },
    ];
  });
}
