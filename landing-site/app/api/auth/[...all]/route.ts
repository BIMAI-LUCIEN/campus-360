import { toNextJsHandler } from "better-auth/next-js";
import { auth, authAvailable } from "@/lib/auth";
import { NextResponse } from "next/server";

// Catch-all for /api/auth/* — handles sign-up, sign-in, sign-out, session, OAuth callbacks.
export async function POST(req: Request) {
  if (!auth || !authAvailable) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }
  return toNextJsHandler(auth).POST(req as never);
}

export async function GET(req: Request) {
  if (!auth || !authAvailable) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }
  return toNextJsHandler(auth).GET(req as never);
}