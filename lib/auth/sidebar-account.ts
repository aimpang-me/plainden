export function sidebarAccountLabel(email: string | null): string {
  const trimmed = email?.trim() ?? "";
  if (trimmed.length === 0) return "Sign in";
  return trimmed;
}
