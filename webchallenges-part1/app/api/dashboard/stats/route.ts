import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { db, filesTable, activityLogsTable, usersTable } from "@/lib/db";
import { eq, count, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const userId = authResult.user.userId;

  const [filesResult] = await db
    .select({ count: count() })
    .from(filesTable)
    .where(eq(filesTable.userId, userId));

  const [loginsResult] = await db
    .select({ count: count() })
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.userId, userId), eq(activityLogsTable.action, "login")));

  const [uploadsResult] = await db
    .select({ count: count() })
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.userId, userId), eq(activityLogsTable.action, "file_upload")));

  const recentActivity = await db
    .select({
      id: activityLogsTable.id,
      userId: activityLogsTable.userId,
      action: activityLogsTable.action,
      detail: activityLogsTable.detail,
      ipAddress: activityLogsTable.ipAddress,
      createdAt: activityLogsTable.createdAt,
      userEmail: usersTable.email,
    })
    .from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
    .where(eq(activityLogsTable.userId, userId))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(10);

  return NextResponse.json({
    totalFiles: filesResult?.count ?? 0,
    totalLogins: loginsResult?.count ?? 0,
    totalUploads: uploadsResult?.count ?? 0,
    recentActivity,
  });
}
