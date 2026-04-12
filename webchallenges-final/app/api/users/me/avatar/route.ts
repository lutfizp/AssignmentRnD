import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, rateLimitResponse } from "@/lib/security";
import { storeValidatedUpload, validateUpload } from "@/lib/uploads";

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
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const limit = checkRateLimit({
    key: `avatar:${authResult.user.userId}:${ipAddress}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    await logActivity({
      userId: authResult.user.userId,
      action: "rate_limit_exceeded",
      detail: "Avatar upload rate limit exceeded",
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

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  try {
    const validated = await validateUpload(file, "avatar", 2 * 1024 * 1024);
    const stored = await storeValidatedUpload({
      buffer: validated.buffer,
      originalName: validated.originalName,
      mimeType: validated.mimeType,
      policy: "avatar",
      ownerId: authResult.user.userId,
    });

    const avatarUrl = `/api/avatars/${stored.storedName}`;
    const [user] = await db
      .update(usersTable)
      .set({ avatarUrl })
      .where(eq(usersTable.id, authResult.user.userId))
      .returning();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await logActivity({
      userId: authResult.user.userId,
      action: "avatar_upload",
      detail: `Avatar updated (${(validated.buffer.length / 1024).toFixed(1)} KB, ${validated.mimeType})`,
      ipAddress,
      requestId,
    });

    return NextResponse.json(safeUser(user));
  } catch (error) {
    await logActivity({
      userId: authResult.user.userId,
      action: "avatar_upload_rejected",
      detail: error instanceof Error ? error.message : "Avatar upload rejected",
      ipAddress,
      requestId,
      severity: "warn",
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid avatar upload" },
      { status: 400 },
    );
  }
}
