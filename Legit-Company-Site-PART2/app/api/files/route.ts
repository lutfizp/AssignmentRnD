import { NextRequest, NextResponse } from "next/server";
import { db, filesTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, rateLimitResponse } from "@/lib/security";
import { storeValidatedUpload, validateUpload } from "@/lib/uploads";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const files = await db.select().from(filesTable).where(eq(filesTable.userId, authResult.user.userId));
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const limit = checkRateLimit({
    key: `upload:${authResult.user.userId}:${ipAddress}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      userId: authResult.user.userId,
      action: "rate_limit_exceeded",
      detail: "File upload rate limit exceeded",
      ipAddress,
      requestId,
      severity: "warn",
    });
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const validated = await validateUpload(file, "file", 10 * 1024 * 1024);
    const stored = await storeValidatedUpload({
      buffer: validated.buffer,
      originalName: validated.originalName,
      mimeType: validated.mimeType,
      policy: "file",
      ownerId: authResult.user.userId,
    });

    const [fileRecord] = await db
      .insert(filesTable)
      .values({
        userId: authResult.user.userId,
        filename: stored.storedName,
        originalName: validated.originalName,
        mimeType: validated.mimeType,
        size: validated.buffer.length,
        path: stored.filePath,
      })
      .returning();

    await logActivity({
      userId: authResult.user.userId,
      action: "file_upload",
      detail: `Uploaded ${validated.originalName} (${(validated.buffer.length / 1024).toFixed(1)} KB, ${validated.mimeType})`,
      ipAddress,
      requestId,
    });

    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_upload_rejected",
      detail: error instanceof Error ? error.message : "Upload rejected during validation",
      ipAddress,
      requestId,
      severity: "warn",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid upload" },
      { status: 400 },
    );
  }
}
