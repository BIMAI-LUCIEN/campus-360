import { headers } from "next/headers";
import { auth, authAvailable } from "./auth";

export async function getServerSession() {
  if (!auth || !authAvailable) return null;
  const hdrs = await headers();
  try {
    return await auth.api.getSession({ headers: hdrs });
  } catch {
    return null;
  }
}