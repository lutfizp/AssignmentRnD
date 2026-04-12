import { NextRequest, NextResponse } from "next/server";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { UpdateMeBody } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activityLogger";
import { getRequestContext } from "@/lib/security";

const safeUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
});

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authResult.user.userId));
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(safeUser(user));
}

export async function PATCH(req: NextRequest) {
  // Step 1: Validate authentication
  const authResult = requireAuth(req);
  if (!authResult.success) return authResult.error;



  const { ipAddress, requestId } = getRequestContext(req);

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateMeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, authResult.user.userId))
    .returning();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await logActivity({
    userId: authResult.user.userId,
    action: "profile_update",
    detail: `Updated: ${Object.keys(parsed.data).join(", ")}`,
    ipAddress,
    requestId,
  });

  return NextResponse.json(safeUser(user));
}



