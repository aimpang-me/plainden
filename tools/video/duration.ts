export function durationSeconds(text: string): number | null {
  const trimmed = text.trim();
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}
