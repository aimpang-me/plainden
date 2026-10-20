const defaultDisabled = ["scaffold", "legal", "image", "video", "data", "subtitles", "cookie-refund"] as const;

export function disabledToolIds(raw?: string): readonly string[] {
  const value = raw !== undefined ? raw : process.env.TOOLS_DISABLED;
  if (value === undefined || value.trim() === "") return [...defaultDisabled];
  return [...new Set(value.split(",").map((part) => part.trim()).filter((part) => part.length > 0))];
}
