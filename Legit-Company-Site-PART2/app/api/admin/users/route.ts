import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
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

export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const limit = checkRateLimit({
    key: `admin-list-users:${authResult.user.userId}:${ipAddress}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      userId: authResult.user.userId,
      action: "rate_limit_exceeded",
      detail: "Admin user listing rate limit exceeded",
      ipAddress,
      requestId,
      severity: "warn",
    });
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  await logActivity({
    userId: authResult.user.userId,
    action: "admin_list_users",
    detail: "Admin viewed user list",
    ipAddress,
    requestId,
  });

  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  return NextResponse.json(users.map(safeUser));
}
