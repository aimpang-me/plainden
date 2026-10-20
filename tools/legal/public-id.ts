const policyPublicIdPattern = /^[0-9a-f]{32}$/;

export function isPolicyPublicId(id: string): boolean {
  return policyPublicIdPattern.test(id);
}
