import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.SESSION_SECRET || "default_build_secret_change_me_in_production";

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
      error: NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 }) 
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
      error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) 
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
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) 
    };
  }
  
  return authResult;
}
