"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function signOutAction() {
  const hdrs = await headers();
  await auth.api.signOut({ headers: hdrs });
  redirect("/");
}