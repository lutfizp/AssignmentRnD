# Final Documentation: React2Shell Remediation

## Summary

`webchallenges-final` is the last stage of the assignment. This folder is not a new feature build and not a repeat of Part 2 hardening. It is a small remediation layer on top of `webchallenges-part2`, focused specifically on closing the `React2Shell` exploitation path while keeping the application behavior intact.

So the progression is:

- `webchallenges-part1`: baseline application
- `webchallenges-part2`: general security hardening
- `webchallenges-final`: targeted remediation for the `React2Shell` path

## How the React2Shell Patch Works

The exploit in this repository targets the React Server Actions request flow, especially requests that arrive as `POST` requests with the `Next-Action` header. Because this application does not need Server Actions for its actual features, the final patch removes that execution surface instead of trying to keep it available.

The remediation is intentionally simple and layered:

### 1. Block `Next-Action` Requests in Middleware

The main runtime patch is in [`middleware.ts`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/middleware.ts).

Compared with Part 2, the middleware now inspects every request and checks:

- whether the method is `POST`
- whether the request contains the `next-action` header

If both are true, the request is rejected with `403` before it reaches route logic or any server-side action handling.

This is the most direct repository-level mitigation because the exploit path depends on that request shape.

### 2. Remove Server Actions Configuration

In [`next.config.mjs`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/next.config.mjs), the final build removes:

```js
experimental: {
  serverActions: {
    bodySizeLimit: "2mb",
  },
}
```

That configuration existed in Part 2 even though the app does not rely on Server Actions for business functionality. Removing it reduces unnecessary exposure and makes the final build consistent with the decision to fully disable that path.

### 3. Upgrade Next.js to the Patched Version

In [`package.json`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/package.json), the framework version is upgraded from `next@15.1.7` to `next@15.1.11`.

This matters because middleware blocking is defense-in-depth, but the framework itself should also be on the patched release line. So the final remediation is:

- upgrade the framework
- disable the unneeded execution surface
- reject exploit-shaped requests before application handling

## What Changed from Part 2

The final folder mostly reuses the hardened code from `webchallenges-part2`. Only a few files were intentionally changed:

### [`middleware.ts`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/middleware.ts)

New logic added:

- import `NextRequest`
- detect `POST` requests carrying the `next-action` header
- return `403` JSON response for those requests

This is the core patch related to `React2Shell`.

### [`next.config.mjs`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/next.config.mjs)

Changes from Part 2:

- removed `experimental.serverActions`
- added `Cache-Control: no-store` to global headers

The important remediation point here is the removal of the Server Actions config.

### [`package.json`](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/package.json)

Changes from Part 2:

- package name changed from `webchallenges-part2` to `webchallenges-final`
- `next` upgraded from `15.1.7` to `15.1.11`
- `eslint-config-next` upgraded to match

## Relationship with Part 2

Part 2 already handled the broader hardening work such as:

- secure file upload validation
- rate limiting
- stricter request validation
- safer filesystem access
- better logging and runtime safeguards

The final build does not replace those controls. It keeps them, then adds a narrow remediation specifically for the `React2Shell` path.

Because of that, the final documentation should be read as:

- Part 2 explains the broad security improvements
- Final explains the extra patch that closes the Server Actions-based exploit surface

## Conclusion

The key point of `webchallenges-final` is not that many files changed, but that the right execution path was removed. The application already had general hardening in Part 2; the final stage adds a focused fix for the `React2Shell` vector by blocking `Next-Action` requests, removing unneeded Server Actions configuration, and upgrading Next.js to the patched release.
