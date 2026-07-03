import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Catch-all for /api/auth/* — handles sign-up, sign-in, sign-out, session, OAuth callbacks.
export const { POST, GET } = toNextJsHandler(auth);