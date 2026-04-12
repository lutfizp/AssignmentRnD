import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { RegisterBody } from "@/lib/schemas";
import { signToken } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, rateLimitResponse } from "@/lib/security";

const safeUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
});

export async function POST(req: NextRequest) {
  const { ipAddress, requestId } = getRequestContext(req);
  const limit = checkRateLimit({
    key: `register:${ipAddress}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      action: "rate_limit_exceeded",
      detail: "Registration rate limit exceeded",
      ipAddress,
      requestId,
      severity: "warn",
    });
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RegisterBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    await logActivity({
      action: "register_conflict",
      detail: `Registration attempt for existing email ${email}`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role: "user" }).returning();
  const token = signToken({ userId: user.id, role: user.role });

  await logActivity({
    userId: user.id,
    action: "register",
    detail: `User ${email} registered`,
    ipAddress,
    requestId,
  });

  return NextResponse.json({ token, user: safeUser(user) }, { status: 201 });
}
