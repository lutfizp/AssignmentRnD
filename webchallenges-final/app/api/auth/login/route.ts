import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@/lib/schemas";
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
    key: `login:${ipAddress}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      action: "rate_limit_exceeded",
      detail: "Login rate limit exceeded",
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

  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    await logActivity({
      action: "login_failed",
      detail: `Login attempt for unknown account ${email}`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      detail: `Failed login attempt for ${email}`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({ userId: user.id, role: user.role });

  await logActivity({
    userId: user.id,
    action: "login",
    detail: `User ${email} logged in`,
    ipAddress,
    requestId,
  });

  return NextResponse.json({ token, user: safeUser(user) });
}
