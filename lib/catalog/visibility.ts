const defaultDisabled: readonly string[] = [];

export function disabledToolIds(raw?: string): readonly string[] {
  const value = raw !== undefined ? raw : process.env.TOOLS_DISABLED;
  if (value === undefined || value.trim() === "") return [...defaultDisabled];
  if (value.trim() === "none") return [];
  return [...new Set(value.split(",").map((part) => part.trim()).filter((part) => part.length > 0))];
}
