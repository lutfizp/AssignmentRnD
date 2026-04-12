import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextRequest } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts the best possible client IP address from a request.
 * Handles X-Forwarded-For (proxies), X-Real-IP, and standard connection IP.
 * Cleans up IPv6-mapped IPv4 addresses (::ffff:).
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  
  let ip = "unknown";
  
  if (forwarded) {
    // Get the first IP in the list (actual client)
    ip = forwarded.split(",")[0].trim();
  } else if (realIp) {
    ip = realIp;
  } else {
    // Fallback to connection IP
    ip = (req as any).ip || "unknown";
  }

  // Clean up IPv6-mapped IPv4 (e.g., ::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  
  return ip;
}
