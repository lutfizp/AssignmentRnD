import { NextRequest, NextResponse } from "next/server";
import { db, filesTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { GetFileParams, DeleteFileParams } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { getRequestContext } from "@/lib/security";
import { deleteStoredFile } from "@/lib/uploads";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const p = GetFileParams.safeParse({ id: (await params).id });
  if (!p.success) {
    return NextResponse.json({ error: p.error.message }, { status: 400 });
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, p.data.id), eq(filesTable.userId, authResult.user.userId)));

  if (!file) {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_access_denied",
      detail: `Attempted to access file ID ${p.data.id} - not found or unauthorized`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const { ipAddress, requestId } = getRequestContext(req);
  const p = DeleteFileParams.safeParse({ id: (await params).id });
  if (!p.success) {
    return NextResponse.json({ error: p.error.message }, { status: 400 });
  }

  const [file] = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.id, p.data.id), eq(filesTable.userId, authResult.user.userId)));

  if (!file) {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_access_denied",
      detail: `Attempted delete on file ID ${p.data.id} - not found or unauthorized`,
      ipAddress,
      requestId,
      severity: "warn",
    });
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await deleteStoredFile(file.path);
  } catch {
    await logActivity({
      userId: authResult.user.userId,
      action: "file_delete_storage_mismatch",
      detail: `Stored file missing or invalid path for file ID ${file.id}`,
      ipAddress,
      requestId,
      severity: "warn",
    });
  }

  await db.delete(filesTable).where(eq(filesTable.id, p.data.id));

  await logActivity({
    userId: authResult.user.userId,
    action: "file_delete",
    detail: `Deleted: ${file.originalName}`,
    ipAddress,
    requestId,
  });

  return new NextResponse(null, { status: 204 });
}
