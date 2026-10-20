import { headers } from "next/headers";
import { getAuth } from "./server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  let headerList: Headers;
  try {
    headerList = await headers();
  } catch {
    return null;
  }
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: headerList });
  if (!session?.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
