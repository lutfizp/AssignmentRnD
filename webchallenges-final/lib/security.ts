import crypto from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/utils";

const SINGLE_LINE_CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const MULTILINE_CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

type SanitizeOptions = {
  maxLength: number;
  allowNewlines?: boolean;
};

export function sanitizeText(value: string, opts: SanitizeOptions): string {
  const normalized = value.normalize("NFKC").trim();
  const cleaned = opts.allowNewlines
    ? normalized.replace(MULTILINE_CONTROL_CHARS, "")
    : normalized.replace(SINGLE_LINE_CONTROL_CHARS, " ").replace(/\s+/g, " ");

  return cleaned.slice(0, opts.maxLength);
}

export function sanitizeFilename(filename: string, fallback = "file"): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext);
  const safeBase = sanitizeText(base, { maxLength: 80 })
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .replace(/\.+/g, ".")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_. ]+|[-_. ]+$/g, "");

  const safeExt = ext.replace(/[^a-z0-9.]/g, "").slice(0, 10);
  return `${safeBase || fallback}${safeExt}`;
}

export function getRequestContext(req: NextRequest) {
  return {
    ipAddress: getClientIp(req),
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
  };
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
      },
    },
  );
}

export function assertPathWithin(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return (
    resolvedTarget === resolvedBase ||
    resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)
  );
}

