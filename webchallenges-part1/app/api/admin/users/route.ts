import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";

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

  const ip = getClientIp(req);

  await logActivity({
    userId: authResult.user.userId,
    action: "admin_list_users",
    detail: "Admin viewed user list",
    ipAddress: ip,
  });

  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  return NextResponse.json(users.map(safeUser));
}
