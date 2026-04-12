import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { RegisterBody } from "@/lib/schemas";
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

  const parsed = RegisterBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role: "user" }).returning();

  const token = signToken({ userId: user.id, role: user.role });

  const ip = getClientIp(req);

  await logActivity({
    userId: user.id,
    action: "register",
    detail: `User ${email} registered`,
    ipAddress: ip,
  });

  return NextResponse.json({ token, user: safeUser(user) }, { status: 201 });
}
