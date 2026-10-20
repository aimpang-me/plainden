export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return null;
}
