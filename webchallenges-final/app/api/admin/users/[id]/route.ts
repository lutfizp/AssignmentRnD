import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { AdminUpdateUserBody, AdminUpdateUserParams } from "@/lib/schemas";
import { requireAdmin } from "@/lib/auth";
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAdmin(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const limit = checkRateLimit({
    key: `admin-user-update:${authResult.user.userId}:${ipAddress}`,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      userId: authResult.user.userId,
      action: "rate_limit_exceeded",
      detail: "Admin user update rate limit exceeded",
      ipAddress,
      requestId,
      severity: "warn",
    });
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const p = AdminUpdateUserParams.safeParse({ id: (await params).id });
  if (!p.success) {
    return NextResponse.json({ error: p.error.message }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AdminUpdateUserBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  if (p.data.id === authResult.user.userId && parsed.data.role && parsed.data.role !== "admin") {
    await logActivity({
      userId: authResult.user.userId,
      action: "admin_self_role_change_blocked",
      detail: "Admin attempted to remove their own admin role",
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 });
  }

  const [before] = await db.select().from(usersTable).where(eq(usersTable.id, p.data.id));

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, p.data.id))
    .returning();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await logActivity({
    userId: authResult.user.userId,
    action: "admin_user_update",
    detail: `Admin changed user #${p.data.id} (${before?.email}) role: ${before?.role} -> ${user.role}`,
    ipAddress,
    requestId,
  });

  return NextResponse.json(safeUser(user));
}
