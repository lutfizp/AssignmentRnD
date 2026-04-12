import { db, activityLogsTable } from "@/lib/db";
import { logger } from "@/lib/logger";

interface LogOptions {
  userId?: number | null;
  action: string;
  detail?: string;
  ipAddress?: string | null;
  requestId?: string | null;
  severity?: "info" | "warn" | "error";
}

export async function logActivity(opts: LogOptions): Promise<void> {
  const severity = opts.severity ?? "info";

  logger[severity](
    {
      event: "audit",
      action: opts.action,
      userId: opts.userId ?? null,
      ipAddress: opts.ipAddress ?? null,
      requestId: opts.requestId ?? null,
    },
    opts.detail ?? opts.action,
  );

  try {
    await db.insert(activityLogsTable).values({
      userId: opts.userId ?? null,
      action: opts.action,
      detail: opts.detail ?? null,
      ipAddress: opts.ipAddress ?? null,
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        event: "audit_write_failed",
        action: opts.action,
        userId: opts.userId ?? null,
        ipAddress: opts.ipAddress ?? null,
        requestId: opts.requestId ?? null,
      },
      "Failed to persist audit log entry",
    );
  }
}
