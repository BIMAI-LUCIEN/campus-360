"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://campus360b.site"),
  // The session cookie is shared with the admin and mobile apps because they
  // all hit the same Supabase database — but since they're on different
  // Vercel projects, the cookies are scoped per-domain. That's fine for now.
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;