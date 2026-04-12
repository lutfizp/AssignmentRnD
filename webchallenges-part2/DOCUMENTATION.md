# Part 2 Documentation: Security Design and Hardening

## Overview

Part 2 hardens the Part 1 application without changing its core business features. The system still provides JWT-based authentication, profile management, file uploads, admin access, and audit logs. The difference is that Part 2 treats those same features with stronger security boundaries.

Based on `ObjectivePart2.txt`, this phase had four goals:

1. Identify at least three vulnerabilities in the existing implementation
2. Implement secure file upload handling
3. Add rate limiting or basic abuse protection
4. Add at least two additional security controls

This document explains the hardening work by showing what Part 1 did, what was changed in Part 2, and why the new implementation is better.

## Identified Vulnerabilities

### 1. Insecure File Upload Handling

In Part 1, the file upload route in [app/api/files/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/app/api/files/route.ts) accepted any file as long as it existed and did not exceed the size limit. The code trusted `file.type`, derived the extension from `file.name`, generated a filename from timestamp and random number, and wrote the buffer directly to disk with `fs.writeFileSync(...)`.

The avatar route in [app/api/users/me/avatar/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/app/api/users/me/avatar/route.ts) had the same weakness. It only checked `file.type.startsWith("image/")`, then always stored the avatar with a `.jpg` suffix regardless of what was actually uploaded.

This was risky because:

- the server trusted client-declared MIME types
- filenames and extensions still depended on user input
- file content was never validated
- mismatched or disguised uploads could be stored as if they were safe

### 2. Missing Rate Limiting

In Part 1, there was no throttling on sensitive endpoints. The login route in [app/api/auth/login/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/app/api/auth/login/route.ts) processed every request immediately after JSON parsing. The same pattern existed for registration, uploads, avatar uploads, and admin routes.

That meant the system had no built-in protection against:

- brute-force login attempts
- repeated registration abuse
- upload flooding
- high-volume probing of admin functionality

### 3. Weak Input Validation and Sanitization

In Part 1, validation existed, but it was too permissive. In [lib/schemas.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/lib/schemas.ts):

- `RegisterBody.name` was just `zod.string()`
- `LoginBody.password` was just `zod.string()`
- `UpdateMeBody` accepted `name`, `bio`, and `avatarUrl`
- request objects were not strict

This allowed loose input handling, inconsistent formatting, and unnecessary exposure of fields that should have been controlled through dedicated routes.

### 4. Filesystem Trust and IDOR-Adjacent Risk

Part 1 already had owner-based file queries, which was a good starting point. But filesystem operations still trusted the stored path too much. For example, Part 1 file delete and file view routes performed direct operations on `file.path` using `fs.unlinkSync(...)` and `fs.readFileSync(...)`.

So even though ownership checks existed, the system did not additionally verify that resolved file paths remained inside the intended upload directory before reading or deleting a file.

### 5. Limited Security Observability

In Part 1, [lib/activityLogger.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/lib/activityLogger.ts) only inserted rows into the database. It did not support severity levels, request IDs, or structured security-oriented logging. The result was still useful for history, but weaker for investigation and monitoring.

### 6. Unsafe JWT Secret Fallback

In Part 1, [lib/auth.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/lib/auth.ts) resolved the secret like this:

```ts
const JWT_SECRET = process.env.SESSION_SECRET || "default_build_secret_change_me_in_production";
```

That fallback is acceptable for local development convenience, but unsafe if a production deployment accidentally starts without a real secret.

## Security Controls Implemented

### 1. Secure File Upload Handling

Part 2 introduces [lib/uploads.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/uploads.ts) and moves file handling behind dedicated helpers.

In Part 1, the upload route wrote files directly:

```ts
const ext = path.extname(file.name);
const filename = `${unique}${ext}`;
const filePath = path.join(uploadDir, filename);

const arrayBuffer = await file.arrayBuffer();
fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
```

In Part 2, the route first validates the upload, then stores it through controlled helpers:

```ts
const validated = await validateUpload(file, "file", 10 * 1024 * 1024);
const stored = await storeValidatedUpload({
  buffer: validated.buffer,
  originalName: validated.originalName,
  mimeType: validated.mimeType,
  policy: "file",
  ownerId: authResult.user.userId,
});
```

This change matters because Part 2 now:

- uses MIME and extension allowlists
- validates binary file signatures
- sanitizes filenames
- generates server-side stored names
- separates avatar policy from general file policy
- validates filesystem path containment before write, read, or delete

Avatar handling was also corrected. In Part 1, the avatar route always generated a `.jpg` filename. In Part 2, the avatar route in [app/api/users/me/avatar/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/users/me/avatar/route.ts) validates the real content first and stores the avatar using the validated extension.

### 2. Rate Limiting and Abuse Protection

Part 2 adds [lib/rate-limit.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/rate-limit.ts) and applies it directly in sensitive routes.

In Part 1, the login route moved from parsing to credential checks immediately. In Part 2, [app/api/auth/login/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/auth/login/route.ts) first checks:

```ts
const limit = checkRateLimit({
  key: `login:${ipAddress}`,
  limit: 5,
  windowMs: 15 * 60 * 1000,
});
```

If the request exceeds the limit, the route logs a warning event and returns a standardized `429` response with `Retry-After`.

The same protection pattern is now used for:

- login
- registration
- file upload
- avatar upload
- admin list users
- admin update user

Compared with Part 1, Part 2 is now resistant to repeated high-volume abuse on the endpoints that matter most.

### 3. Input Validation and Sanitization

Part 2 tightens request schemas in [lib/schemas.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/schemas.ts) and centralizes cleanup logic in [lib/security.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/security.ts).

In Part 1, the profile update schema looked like this:

```ts
export const UpdateMeBody = zod.object({
  name: zod.string().optional(),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
});
```

In Part 2, it became:

```ts
export const UpdateMeBody = zod.object({
  name: sanitizedNameSchema.optional(),
  bio: sanitizedBioSchema.nullish(),
}).strict();
```

That is a meaningful improvement because Part 2 now:

- normalizes text with `sanitizeText(...)`
- trims and lowercases emails
- applies proper size boundaries
- rejects extra unexpected fields through `.strict()`
- removes direct `avatarUrl` updates from the profile API

Part 1 validated syntax. Part 2 validates syntax, normalizes content, and narrows the allowed shape of the request body.

### 4. Access Control and Filesystem Hardening

Part 1 already used owner-based file queries, which was good. Part 2 keeps that control and adds filesystem safety around it.

In Part 1, delete logic eventually did this:

```ts
if (fs.existsSync(file.path)) {
  fs.unlinkSync(file.path);
}
```

In Part 2, deletion goes through a safe helper:

```ts
await deleteStoredFile(file.path);
```

That helper internally verifies the file path is still inside the expected upload directory before deletion is allowed.

The same is true for reads. Part 1 used `fs.readFileSync(file.path)`. Part 2 uses:

- `fileExists(file.path)`
- `readStoredFile(file.path)`
- `assertPathWithin(...)`

This means Part 2 protects both the authorization decision and the filesystem operation that follows it.

Part 2 also adds admin self-protection. In [app/api/admin/users/[id]/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/admin/users/%5Bid%5D/route.ts), an admin can no longer remove their own admin role. That check did not exist in Part 1.

### 5. Logging and Monitoring Improvements

In Part 1, [lib/activityLogger.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part1/lib/activityLogger.ts) only inserted audit rows into the database:

```ts
await db.insert(activityLogsTable).values({
  userId: opts.userId ?? null,
  action: opts.action,
  detail: opts.detail ?? null,
  ipAddress: opts.ipAddress ?? null,
});
```

In Part 2, [lib/activityLogger.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/activityLogger.ts) adds:

- severity support
- request ID support
- structured logging through [lib/logger.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/logger.ts)
- error handling if audit persistence fails

Routes also now use `getRequestContext(...)` from `lib/security.ts`, so security events consistently carry:

- IP address
- request ID
- severity

This makes Part 2 much easier to monitor when something suspicious happens, such as failed login, upload rejection, denied file access, or rate-limit violations.

### 6. Safer Secret Handling and Security Headers

JWT handling in Part 2 is safer than Part 1. Instead of resolving the secret once with a silent fallback, [lib/auth.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/auth.ts) uses `getJwtSecret()`.

The improvement is simple but important:

- if `SESSION_SECRET` exists, it is used normally
- if it is missing in production, the app throws
- if it is missing in development, the fallback is still available but logged as a warning

Part 2 also adds global response headers in [next.config.mjs](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/next.config.mjs), including:

- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`

File-serving routes also add `nosniff` and safer cache behavior. Part 1 had none of these protections configured globally.

## Part 1 vs Part 2 Comparison

| Area | Part 1 | Part 2 | Why Part 2 Is Better |
|---|---|---|---|
| File upload | Basic size check and direct disk write | Validated content, safe storage helpers, path checks | Reduces risk of disguised or unsafe uploads |
| Avatar upload | Trusts `image/*` and forces `.jpg` | Validates real content and stores with proper type | Prevents content-type mismatch |
| Rate limiting | None | Added to high-risk endpoints | Reduces brute force and abuse |
| Validation | Loose schemas | Sanitized, bounded, strict schemas | Less trust in request input |
| Profile update | Could include `avatarUrl` | `avatarUrl` removed from update schema | Narrows the writable surface |
| File access | Owner check only | Owner check plus filesystem containment | Protects both auth layer and storage layer |
| Logging | Database audit only | Severity-aware structured logging plus DB | Better monitoring and incident analysis |
| JWT secret | Silent fallback possible | Production requires explicit secret | Safer deployment behavior |
| Security headers | Minimal | Global hardening headers added | Better browser-side security posture |

## Implementation Summary

The most important Part 2 files are:

- [lib/uploads.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/uploads.ts)
- [lib/security.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/security.ts)
- [lib/rate-limit.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/rate-limit.ts)
- [lib/schemas.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/schemas.ts)
- [lib/activityLogger.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/activityLogger.ts)
- [lib/auth.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/lib/auth.ts)
- [app/api/files/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/files/route.ts)
- [app/api/auth/login/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/auth/login/route.ts)
- [app/api/auth/register/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/auth/register/route.ts)
- [app/api/admin/users/[id]/route.ts](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-part2/app/api/admin/users/%5Bid%5D/route.ts)

Together, these changes satisfy the Part 2 objective. The codebase identifies more than three security weaknesses, implements secure upload validation, adds rate limiting, and introduces additional controls in validation, access control, observability, and runtime configuration safety.

