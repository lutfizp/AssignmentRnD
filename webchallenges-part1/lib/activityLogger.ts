import { db, activityLogsTable } from "@/lib/db";

interface LogOptions {
  userId?: number | null;
  action: string;
  detail?: string;
  ipAddress?: string | null;
}

export async function logActivity(opts: LogOptions): Promise<void> {
  await db.insert(activityLogsTable).values({
    userId: opts.userId ?? null,
    action: opts.action,
    detail: opts.detail ?? null,
    ipAddress: opts.ipAddress ?? null,
  });
}
