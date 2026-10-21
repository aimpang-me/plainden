const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length > 254) return false;
  if (email.includes(" ")) return false;
  return emailPattern.test(email);
}
