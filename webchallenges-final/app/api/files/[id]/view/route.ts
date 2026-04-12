import { NextRequest, NextResponse } from "next/server";
import { db, filesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { getRequestContext } from "@/lib/security";
import { fileExists, readStoredFile } from "@/lib/uploads";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const id = parseInt((await params).id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, id), eq(filesTable.userId, authResult.user.userId)));

  if (!file) {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_access_denied",
      detail: `Unauthorized view attempt on file ID ${id}`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!(await fileExists(file.path))) {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_missing_on_disk",
      detail: `File ID ${file.id} was requested but is missing from storage`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  await logActivity({
    userId: authResult.user.userId,
    action: "file_view",
    detail: `Viewed: ${file.originalName}`,
    ipAddress,
    requestId,
  });

  const buffer = await readStoredFile(file.path);
  const inline =
    file.mimeType.startsWith("image/") ||
    file.mimeType === "application/pdf" ||
    file.mimeType.startsWith("text/");

  const headers = new Headers();
  headers.set("Content-Type", file.mimeType);
  headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${file.originalName}"`);
  headers.set("Content-Length", file.size.toString());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(buffer, { status: 200, headers });
}
