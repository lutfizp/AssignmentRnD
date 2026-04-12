import { getClientIp } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "uploads", "avatars", filename);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  
  let mimeType = "image/jpeg";
  if (filename.endsWith(".png")) mimeType = "image/png";
  else if (filename.endsWith(".gif")) mimeType = "image/gif";
  else if (filename.endsWith(".webp")) mimeType = "image/webp";

  const headers = new Headers();
  headers.set("Content-Type", mimeType);

  return new NextResponse(buffer, { status: 200, headers });
}
