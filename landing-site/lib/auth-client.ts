"use client";

import { createAuthClient } from "better-auth/react";

// Use Vercel deployment URL in preview, fallback to env or hardcoded.
// This prevents "Invalid base URL" errors when the custom domain isn't accessible.
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL;
  }
  return "https://campus-360-landing-ke5ahqi0c-bimai-s-projects.vercel.app";
};

let authClient: ReturnType<typeof createAuthClient> | null = null;

try {
  authClient = createAuthClient({
    baseURL: getBaseUrl(),
  });
} catch (err) {
  console.error("[auth-client] Failed to create auth client:", err);
}

const noopError = { error: { message: "Auth non configuré. Déployez avec DATABASE_URL." } };

// Export a safe wrapper — functions return error objects instead of throwing when unconfigured.
export const signIn = authClient
  ? authClient.signIn
  : ({
      email: async () => noopError,
      social: async () => noopError,
    } as unknown as ReturnType<typeof createAuthClient>["signIn"]);

export const signUp = authClient
  ? authClient.signUp
  : ({ email: async () => noopError } as unknown as ReturnType<typeof createAuthClient>["signUp"]);

export const signOut = authClient
  ? authClient.signOut
  : ({ email: async () => noopError } as unknown as ReturnType<typeof createAuthClient>["signOut"]);

export const useSession = authClient
  ? authClient.useSession
  : ((() => ({ data: null, isLoading: false, error: null })) as unknown as ReturnType<typeof createAuthClient>["useSession"]);

export const getSession = authClient
  ? authClient.getSession
  : async () => ({ session: null, user: null });