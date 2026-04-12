import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const isServerActionRequest = req.method === "POST" && req.headers.has("next-action");

  // This application does not use React Server Actions, so block requests
  // targeting that execution surface in the final remediated build.
  if (isServerActionRequest) {
    return NextResponse.json(
      {
        error: "Server Actions are disabled in the final build.",
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
