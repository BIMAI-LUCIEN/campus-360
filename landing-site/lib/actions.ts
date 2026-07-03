"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, authAvailable } from "./auth";

export async function signOutAction() {
  if (!auth || !authAvailable) {
    redirect("/");
    return;
  }
  const hdrs = await headers();
  try {
    await auth.api.signOut({ headers: hdrs });
  } catch {
    // ignore
  }
  redirect("/");
}