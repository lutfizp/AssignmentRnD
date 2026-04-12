import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { db, activityLogsTable, usersTable } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const query = db
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
    .orderBy(desc(activityLogsTable.createdAt));

  if (authResult.user.role === "admin") {
    const logs = await query.limit(200);
    return NextResponse.json(logs);
  } else {
    const logs = await query.where(eq(activityLogsTable.userId, authResult.user.userId)).limit(100);
    return NextResponse.json(logs);
  }
}
