import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { fileExists, readStoredFile, uploadDirectories } from "@/lib/uploads";
import { assertPathWithin } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(uploadDirectories.avatars, filename);
  if (!assertPathWithin(uploadDirectories.avatars, filePath)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  if (!(await fileExists(filePath, uploadDirectories.avatars))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = await readStoredFile(filePath, uploadDirectories.avatars);

  let mimeType = "image/jpeg";
  if (filename.endsWith(".png")) mimeType = "image/png";
  else if (filename.endsWith(".gif")) mimeType = "image/gif";
  else if (filename.endsWith(".webp")) mimeType = "image/webp";

  const headers = new Headers();
  headers.set("Content-Type", mimeType);
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(buffer, { status: 200, headers });
}
