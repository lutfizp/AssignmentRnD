import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db, filesTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const files = await db.select().from(filesTable).where(eq(filesTable.userId, authResult.user.userId));
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const ip = getClientIp(req);
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

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.name);
  const filename = `${unique}${ext}`;
  const filePath = path.join(uploadDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  const [fileRecord] = await db
    .insert(filesTable)
    .values({
      userId: authResult.user.userId,
      filename,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      path: filePath,
    })
    .returning();

  await logActivity({
    userId: authResult.user.userId,
    action: "file_upload",
    detail: `Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
    ipAddress: ip,
  });

  return NextResponse.json(fileRecord, { status: 201 });
}
