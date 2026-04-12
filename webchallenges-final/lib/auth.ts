import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const FALLBACK_SECRET = "default_build_secret_change_me_in_production";
const isProduction = process.env.NODE_ENV === "production";
let hasWarnedAboutFallback = false;

function getJwtSecret() {
  const configuredSecret = process.env.SESSION_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (isProduction) {
    throw new Error("SESSION_SECRET must be configured in production");
  }

  if (!hasWarnedAboutFallback) {
    logger.warn("SESSION_SECRET is not set; using a development fallback secret");
    hasWarnedAboutFallback = true;
  }

  return FALLBACK_SECRET;
}

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export type AuthResult =
  | { success: true; user: JwtPayload; error: null }
  | { success: false; user: null; error: NextResponse };

export function requireAuth(req: NextRequest): AuthResult {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      user: null,
      error: NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    return { success: true, user: payload, error: null };
  } catch {
    return {
      success: false,
      user: null,
      error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }),
    };
  }
}

export function requireAdmin(req: NextRequest): AuthResult {
  const authResult = requireAuth(req);
  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.role !== "admin") {
    return {
      success: false,
      user: null,
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return authResult;
}
