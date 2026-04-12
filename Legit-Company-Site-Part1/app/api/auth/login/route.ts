import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@/lib/schemas";
import { signToken } from "@/lib/auth";
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
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LoginBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(req);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    await logActivity({
      action: "login_failed",
      detail: `Login attempt for non-existent email ${email}`,
      ipAddress: ip,
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      detail: `Failed login attempt for ${email}`,
      ipAddress: ip,
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken({ userId: user.id, role: user.role });

  await logActivity({
    userId: user.id,
    action: "login",
    detail: `User ${email} logged in`,
    ipAddress: ip,
  });

  return NextResponse.json({ token, user: safeUser(user) });
}
