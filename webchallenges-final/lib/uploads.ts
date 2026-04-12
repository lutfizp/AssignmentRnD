import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { assertPathWithin, sanitizeFilename } from "@/lib/security";

type UploadPolicy = "file" | "avatar";

type AllowedFileType = {
  mimeType: string;
  extensions: string[];
  signatures: Buffer[];
};

const GENERAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");
const AVATAR_UPLOAD_DIR = path.join(GENERAL_UPLOAD_DIR, "avatars");

const allowedTypes: Record<UploadPolicy, AllowedFileType[]> = {
  file: [
    {
      mimeType: "application/pdf",
      extensions: [".pdf"],
      signatures: [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    },
    {
      mimeType: "image/png",
      extensions: [".png"],
      signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    },
    {
      mimeType: "image/jpeg",
      extensions: [".jpg", ".jpeg"],
      signatures: [Buffer.from([0xff, 0xd8, 0xff])],
    },
    {
      mimeType: "image/gif",
      extensions: [".gif"],
      signatures: [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
    },
    {
      mimeType: "image/webp",
      extensions: [".webp"],
      signatures: [Buffer.from("RIFF")],
    },
    {
      mimeType: "text/plain",
      extensions: [".txt", ".log", ".md"],
      signatures: [],
    },
    {
      mimeType: "text/csv",
      extensions: [".csv"],
      signatures: [],
    },
    {
      mimeType: "application/json",
      extensions: [".json"],
      signatures: [],
    },
    {
      mimeType: "application/zip",
      extensions: [".zip"],
      signatures: [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    },
  ],
  avatar: [
    {
      mimeType: "image/png",
      extensions: [".png"],
      signatures: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    },
    {
      mimeType: "image/jpeg",
      extensions: [".jpg", ".jpeg"],
      signatures: [Buffer.from([0xff, 0xd8, 0xff])],
    },
    {
      mimeType: "image/gif",
      extensions: [".gif"],
      signatures: [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
    },
    {
      mimeType: "image/webp",
      extensions: [".webp"],
      signatures: [Buffer.from("RIFF")],
    },
  ],
};

function isMostlyText(buffer: Buffer): boolean {
  for (const byte of buffer.subarray(0, Math.min(buffer.length, 512))) {
    const isAllowedWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d;
    const isPrintable = byte >= 0x20 && byte <= 0x7e;
    if (!isAllowedWhitespace && !isPrintable) {
      return false;
    }
  }

  return true;
}

function matchesSignature(buffer: Buffer, mimeType: string): boolean {
  const config = [...allowedTypes.file, ...allowedTypes.avatar].find((item) => item.mimeType === mimeType);
  if (!config) return false;
  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"));
  }
  if (config.signatures.length === 0) {
    return isMostlyText(buffer);
  }

  return config.signatures.some((signature) => buffer.subarray(0, signature.length).equals(signature));
}

export async function validateUpload(
  file: File,
  policy: UploadPolicy,
  maxBytes: number,
) {
  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }

  if (file.size > maxBytes) {
    throw new Error(`File too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)`);
  }

  const originalName = sanitizeFilename(file.name);
  const extension = path.extname(originalName).toLowerCase();
  const allowed = allowedTypes[policy].find(
    (candidate) =>
      candidate.mimeType === file.type &&
      candidate.extensions.includes(extension),
  );

  if (!allowed) {
    throw new Error(
      policy === "avatar"
        ? "Unsupported avatar type. Use PNG, JPG, GIF, or WEBP."
        : "Unsupported file type. Allowed: PDF, PNG, JPG, GIF, WEBP, TXT, CSV, JSON, ZIP.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(buffer, allowed.mimeType)) {
    throw new Error("Uploaded file content does not match its declared type");
  }

  return {
    buffer,
    extension,
    mimeType: allowed.mimeType,
    originalName,
  };
}

export async function storeValidatedUpload(opts: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  policy: UploadPolicy;
  ownerId?: number;
}) {
  const directory = opts.policy === "avatar" ? AVATAR_UPLOAD_DIR : GENERAL_UPLOAD_DIR;
  await fs.mkdir(directory, { recursive: true });

  const extension = path.extname(opts.originalName).toLowerCase();
  const storedName =
    opts.policy === "avatar"
      ? `avatar-${opts.ownerId ?? "user"}-${crypto.randomUUID()}${extension}`
      : `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(directory, storedName);

  if (!assertPathWithin(directory, filePath)) {
    throw new Error("Resolved upload path is invalid");
  }

  await fs.writeFile(filePath, opts.buffer, { flag: "wx" });

  return {
    filePath,
    storedName,
  };
}

export async function deleteStoredFile(filePath: string, baseDir = GENERAL_UPLOAD_DIR) {
  if (!assertPathWithin(baseDir, filePath)) {
    throw new Error("Refusing to delete a file outside the upload directory");
  }

  await fs.unlink(filePath);
}

export async function readStoredFile(filePath: string, baseDir = GENERAL_UPLOAD_DIR) {
  if (!assertPathWithin(baseDir, filePath)) {
    throw new Error("Refusing to read a file outside the upload directory");
  }

  return fs.readFile(filePath);
}

export async function fileExists(filePath: string, baseDir = GENERAL_UPLOAD_DIR) {
  if (!assertPathWithin(baseDir, filePath)) {
    return false;
  }

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const uploadDirectories = {
  general: GENERAL_UPLOAD_DIR,
  avatars: AVATAR_UPLOAD_DIR,
};
