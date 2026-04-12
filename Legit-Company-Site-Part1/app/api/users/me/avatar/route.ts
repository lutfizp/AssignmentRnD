import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
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

  const file = formData.get("avatar") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed for avatars" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const avatarDir = path.join(process.cwd(), "uploads", "avatars");
  if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
  }

  const filename = `avatar-${authResult.user.userId}-${Date.now()}.jpg`;
  const filePath = path.join(avatarDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  const avatarUrl = `/api/avatars/${filename}`;

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
    detail: `Avatar updated (${(file.size / 1024).toFixed(1)} KB)`,
    ipAddress: ip,
  });

  return NextResponse.json(safeUser(user));
}
