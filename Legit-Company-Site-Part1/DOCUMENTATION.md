# NexaCore Platform Documentation

## 1. Purpose and Scope

This document explains how the Part 1 application satisfies the requirements defined in `Objective.txt`, how to run it, how to verify every required capability, and which parts of the codebase implement each feature.

The application is a full-stack Next.js platform with:

- JWT-based authentication
- Role-based access control
- User profile management
- File upload and retrieval
- Activity logging and audit visibility
- Docker-based local deployment with PostgreSQL

The goal of the project is not only to provide a working website, but to demonstrate a clean and understandable implementation of the core logic behind authentication, authorization, persistence, observability, and deployment.

## 2. Technical Overview

### Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 15 App Router |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Authentication | JWT via `jsonwebtoken` |
| Password Security | `bcryptjs` |
| Validation | `zod` |
| Logging | Database-backed audit log |
| Deployment | Docker + Docker Compose |

### Architecture Summary

The project uses a unified monorepo-style application structure:

- `app/` contains both UI routes and REST API routes.
- `lib/` contains shared business logic such as authentication, database access, validation, and activity logging.
- `lib/db/schema/` defines the database model.
- `hooks/` contains the client-side authentication state and guards.
- `docker-compose.yml` orchestrates the web app, PostgreSQL, and schema migration.

This structure keeps the code easy to navigate: UI stays close to the app routes, while security-critical logic is centralized in reusable modules.

## 3. Running the Application

### Recommended: Docker

This is the intended and easiest way to run the project.

```bash
docker-compose up --build -d
```

Application URL:

```text
http://localhost:3000
```

### Services

- `db`: PostgreSQL database
- `migrate`: applies the current schema using Drizzle
- `app`: production-style Next.js runtime

### Useful Commands

```bash
docker-compose up --build -d
docker-compose logs -f app
docker-compose down
docker-compose down -v
```

### Environment Configuration

The Docker setup reads values from `.env`. A template is available in `.env.example`.

Important variables:

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `NODE_ENV`
- `PORT`

## 4. Database Model

The application uses PostgreSQL and stores all required operational data in the database.

### Tables

#### `users`

Defined in `lib/db/schema/users.ts`.

Stores:

- identity fields (`id`, `name`, `email`)
- authentication material (`password_hash`)
- authorization state (`role`)
- profile data (`bio`, `avatar_url`)
- timestamps

#### `files`

Defined in `lib/db/schema/files.ts`.

Stores file metadata required by the objective:

- file owner (`user_id`)
- internal filename
- original filename
- MIME type
- size
- physical storage path
- upload timestamp

The binary file itself is written to disk under `uploads/`, while the metadata is persisted in the database.

#### `activity_logs`

Defined in `lib/db/schema/activity_logs.ts`.

Stores audit events such as:

- login success and failure
- registration
- profile updates
- avatar updates
- file upload, view, delete
- denied file access
- admin actions

Each log may include:

- `user_id`
- `action`
- `detail`
- `ip_address`
- `created_at`

## 5. Authentication and Authorization Design

### JWT Authentication

Authentication is implemented in `lib/auth.ts`.

Core responsibilities:

- `signToken(payload)` creates a JWT containing `userId` and `role`
- `verifyToken(token)` validates and decodes the token
- `requireAuth(req)` enforces authenticated access
- `requireAdmin(req)` enforces admin-only access

The API expects the token in the `Authorization` header using the standard format:

```text
Authorization: Bearer <token>
```

### Password Handling

Passwords are never stored in plain text.

- Registration hashes the password with `bcrypt.hash(...)` in `app/api/auth/register/route.ts`
- Login verifies the password with `bcrypt.compare(...)` in `app/api/auth/login/route.ts`

### Role-Based Access Control

The project implements two roles:

- `user`
- `admin`

RBAC is enforced at the API layer, not only in the UI. This matters because real access control must be server-side.

Examples:

- `app/api/admin/users/route.ts` uses `requireAdmin(req)`
- `app/api/admin/users/[id]/route.ts` uses `requireAdmin(req)`
- `app/api/users/me/route.ts` uses `requireAuth(req)`
- `app/api/files/route.ts` uses `requireAuth(req)`

The frontend also reflects role restrictions:

- `app/admin/page.tsx` redirects non-admin users away from the admin screen
- `hooks/use-auth.tsx` restores the authenticated session from the stored JWT

## 6. Objective Coverage

This section maps every requirement in `Objective.txt` to the implementation and verification approach.

### 6.1 Authentication System

#### Requirement

- User registration and login
- Token-based authentication
- Role-based access control

#### Implementation

- Registration endpoint: `app/api/auth/register/route.ts`
- Login endpoint: `app/api/auth/login/route.ts`
- JWT helpers: `lib/auth.ts`
- Input validation: `lib/schemas.ts`
- User schema: `lib/db/schema/users.ts`

#### How It Works

1. A new user submits name, email, and password.
2. The payload is validated with Zod.
3. The password is hashed with bcrypt.
4. The user is stored in PostgreSQL with the default role `user`.
5. A JWT is issued immediately after successful registration.
6. Login validates credentials and issues a new JWT.
7. Protected endpoints decode the JWT and authorize access based on the embedded role.

#### How to Verify

1. Open `/register` and create a user.
2. Confirm a successful response returns a token and user object.
3. Open `/login` and sign in with the same credentials.
4. Confirm protected pages such as `/dashboard`, `/profile`, and `/files` become accessible.
5. Call `GET /api/users/me` with no token and confirm it returns `401`.
6. Call `GET /api/users/me` with `Authorization: Bearer <token>` and confirm it returns the authenticated profile.

#### Example API Check

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"password\":\"secret123\"}"
```

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"alice@example.com\",\"password\":\"secret123\"}"
```

### 6.2 User Profile and Access Control

#### Requirement

- Users can view and edit their own profile
- Proper authorization checks
- At least one restricted resource

#### Implementation

- Profile API: `app/api/users/me/route.ts`
- Avatar upload: `app/api/users/me/avatar/route.ts`
- Avatar retrieval: `app/api/avatars/[filename]/route.ts`
- Profile page: `app/profile/page.tsx`
- Admin-only resource: `app/api/admin/users/route.ts`
- Admin management UI: `app/admin/page.tsx`

#### How It Works

- `GET /api/users/me` returns only the currently authenticated user.
- `PATCH /api/users/me` updates only the current user record using the JWT subject.
- Admin-only routes are guarded with `requireAdmin`.
- File access is owner-scoped, which adds another layer of authorization beyond simple login checks.

#### How to Verify

1. Log in as a regular user.
2. Open `/profile` and update the display name or bio.
3. Confirm the change persists after refresh.
4. Attempt to access `/admin` as a regular user and confirm you are redirected away from the page.
5. Call `GET /api/admin/users` with a regular user token and confirm it returns `403`.
6. Promote a user to admin in the database, log in again, and confirm `/admin` becomes available.

#### Why This Matters

The project does not trust the frontend alone. Even if a user manually crafts an HTTP request, the server rechecks identity and role before returning sensitive data.

### 6.3 File Upload System

#### Requirement

- Users can upload files
- Files are retrievable or viewable
- Metadata is stored in the database

#### Implementation

- File list and upload: `app/api/files/route.ts`
- File metadata lookup and delete: `app/api/files/[id]/route.ts`
- File retrieval or preview: `app/api/files/[id]/view/route.ts`
- File schema: `lib/db/schema/files.ts`
- Files page: `app/files/page.tsx`

#### How It Works

- Files are uploaded through multipart form data.
- The server writes the file to `uploads/`.
- Metadata is inserted into the `files` table.
- Listing and retrieval are filtered by authenticated `userId`.
- Inline preview is supported for images, PDF, and text files.
- Other file types are downloaded as attachments.

#### Security-Relevant Behavior

- Uploads require authentication.
- Maximum upload size is limited to 10 MB.
- Access to metadata and file content is constrained to the owning user.
- Unauthorized file lookup attempts are logged as audit events.

#### How to Verify

1. Log in and open `/files`.
2. Upload a file.
3. Confirm the file appears in the table with name, size, type, and date.
4. Open the file preview for a supported type such as image, text, or PDF.
5. Refresh the page and confirm the metadata is still present.
6. Call `GET /api/files` and confirm the uploaded file is returned.
7. Use another user account and try to access `/api/files/{id}` or `/api/files/{id}/view` for the first user's file.
8. Confirm the request fails and a denied-access event is recorded in the audit log.

### 6.4 API Layer

#### Requirement

- Provide REST API endpoints in JSON
- Include at least:
- GET user data
- Update profile
- File upload endpoint

#### Implementation

The project provides a clear REST-style API in `app/api/`.

Primary endpoints:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Authenticate and return JWT |
| `GET` | `/api/users/me` | Return current user profile |
| `PATCH` | `/api/users/me` | Update current user profile |
| `POST` | `/api/users/me/avatar` | Upload avatar |
| `GET` | `/api/files` | List current user's files |
| `POST` | `/api/files` | Upload file |
| `GET` | `/api/files/{id}` | Get file metadata |
| `DELETE` | `/api/files/{id}` | Delete file |
| `GET` | `/api/files/{id}/view` | Stream or download file |
| `GET` | `/api/logs` | Get activity logs |
| `GET` | `/api/admin/users` | Admin-only user list |
| `PATCH` | `/api/admin/users/{id}` | Admin-only role update |
| `GET` | `/api/dashboard/stats` | Dashboard metrics |
| `GET` | `/api/healthz` | Health check |

#### Validation Strategy

`lib/schemas.ts` centralizes Zod schemas for request and response contracts. This makes the API more explicit and keeps validation logic close to the domain model.

#### How to Verify

1. Send requests with valid input and confirm expected JSON responses.
2. Send malformed payloads and confirm the API returns `400`.
3. Send protected requests without a token and confirm the API returns `401`.
4. Send admin-only requests with a non-admin token and confirm the API returns `403`.

### 6.5 Activity Logging

#### Requirement

- Log login attempts
- Log file uploads
- Log profile updates
- Logs can be stored in a file or database

#### Implementation

- Logging helper: `lib/activityLogger.ts`
- Activity log schema: `lib/db/schema/activity_logs.ts`
- Logs API: `app/api/logs/route.ts`
- Logs UI: `app/logs/page.tsx`
- IP extraction helper: `lib/utils.ts`

#### Logged Events in the Current Implementation

- `register`
- `login`
- `login_failed`
- `profile_update`
- `avatar_upload`
- `file_upload`
- `file_view`
- `file_delete`
- `file_access_denied`
- `admin_list_users`
- `admin_user_update`

#### How It Works

`logActivity(...)` is called directly inside the API handlers after important actions. Because the logging is centralized in one helper, the API handlers stay readable while still preserving an audit trail.

The `/api/logs` route enforces visibility rules:

- admins can see a broader set of logs
- regular users only see their own logs

#### How to Verify

1. Perform a successful login and confirm a `login` event appears.
2. Attempt a failed login and confirm a `login_failed` event appears.
3. Update the profile and confirm a `profile_update` event appears.
4. Upload a file and confirm a `file_upload` event appears.
5. Delete or preview a file and confirm the corresponding event appears.
6. Open `/logs` as a regular user and confirm only your own events are visible.
7. Open `/logs` as an admin and confirm broader audit visibility.

## 7. Code Walkthrough by Responsibility

This section explains the most important code units rather than listing every file in the repository.

### `lib/auth.ts`

This is the core authorization gate of the application. It encapsulates:

- token signing
- token verification
- authenticated request enforcement
- admin-only enforcement

Because route handlers call this shared module, access control stays consistent across the API surface.

### `app/api/auth/register/route.ts`

Handles user onboarding:

- parses JSON safely
- validates input with Zod
- checks duplicate email
- hashes password
- creates the database record
- issues JWT
- records a registration log entry

### `app/api/auth/login/route.ts`

Handles session creation:

- validates credentials
- logs failed attempts for unknown users and bad passwords
- issues JWT on success
- writes login audit records

This route is important from both a usability and security standpoint because it gives visibility into authentication failures.

### `app/api/users/me/route.ts`

Implements profile ownership correctly. The route never accepts an arbitrary user ID from the client; it always derives the active user from the JWT payload. This is the right pattern for "my profile" APIs because it prevents horizontal privilege escalation.

### `app/api/files/route.ts`

Implements the upload pipeline:

- reads multipart form data
- validates presence and size
- creates the upload directory if needed
- writes the file to disk
- stores metadata in PostgreSQL
- logs the upload event

### `app/api/files/[id]/route.ts` and `app/api/files/[id]/view/route.ts`

These handlers enforce file ownership. They do not return a file merely because an ID exists. Instead, they query by both:

- file ID
- authenticated user ID

That query shape is one of the key authorization controls in the project.

### `app/api/admin/users/route.ts` and `app/api/admin/users/[id]/route.ts`

These routes show the admin-only resource required by the objective. They demonstrate:

- reusable role enforcement
- safe user projection for API output
- admin action logging for auditability

### `lib/activityLogger.ts`

This helper keeps logging implementation simple and repeatable. It also makes future extension easy, for example if logs later need to be streamed to an external SIEM or monitoring platform.

### `hooks/use-auth.tsx`

This is the client-side session bridge:

- loads the stored token from `localStorage`
- fetches the current user profile
- exposes `login()` and `logout()`
- gives UI pages a simple authenticated state

The UI uses this hook to avoid duplicating session bootstrapping logic across pages.

## 8. Frontend Coverage

Although the objective is backend-heavy, the website also exposes all major capabilities through real screens:

| Route | Purpose |
|---|---|
| `/login` | Sign in |
| `/register` | Create account |
| `/dashboard` | User metrics and recent activity |
| `/profile` | Edit profile and avatar |
| `/files` | Upload, view, download, and delete files |
| `/logs` | Audit log viewer |
| `/admin` | Admin-only user management |

This makes the project straightforward to demonstrate in a browser without depending on external API tooling.

## 9. Step-by-Step Verification Checklist

Use this checklist to validate all objective criteria end to end.

### Authentication

1. Start the stack with Docker.
2. Register a new user.
3. Log in with the same account.
4. Confirm the API returns a JWT.
5. Confirm protected pages become accessible.

### Authorization

1. Access `/api/users/me` without a token and confirm `401`.
2. Access `/api/admin/users` with a normal user token and confirm `403`.
3. Promote a user to admin and confirm admin-only access becomes available.

### Profile

1. Open `/profile`.
2. Update name or bio.
3. Refresh and confirm the data persists in the database.
4. Upload an avatar and confirm the image is rendered afterward.

### Files

1. Upload a file in `/files`.
2. Confirm the file metadata appears in the list.
3. Preview or download the file.
4. Delete the file.
5. Confirm the deletion removes both the database record and the file entry from the UI.

### Logging

1. Trigger login success and failure.
2. Update the profile.
3. Upload and delete a file.
4. Visit `/logs`.
5. Confirm each action appears with timestamp and action detail.

### Docker

1. Run `docker-compose up --build -d`.
2. Confirm the database, migration, and app containers initialize successfully.
3. Open `http://localhost:3000`.
4. Confirm the site is usable without any manual host-side setup.

## 10. Notes on Engineering Quality

The project intentionally favors clarity over unnecessary abstraction.

Strengths visible in the codebase:

- shared auth enforcement instead of repeated token parsing
- database schema defined in one place
- request validation at the API boundary
- audit logging attached to meaningful security-sensitive actions
- clear separation between profile ownership and admin-level privileges
- Dockerized runtime designed for repeatable evaluation

## 11. Production-Oriented Remarks

For a coding challenge, the implementation is complete and practical. For a production hardening phase, the next improvements would likely include:

- stricter file-type allowlists for uploads
- rotating and externally managed secrets
- refresh token or session revocation strategy
- rate limiting on authentication routes
- stronger file content scanning
- automated integration tests

These are not blockers for the assignment criteria, but they are the natural next step if the platform were evolving beyond the challenge scope.

## 12. Conclusion

This Part 1 submission satisfies the objective with a cohesive full-stack implementation:

- authentication is functional and token-based
- access control is enforced server-side
- profile management is user-scoped
- files are uploaded, stored, and retrieved with metadata persistence
- activity logging provides an auditable trail
- Docker makes the system easy to run and evaluate

Most importantly, the core logic is implemented in understandable, reviewable application code rather than hidden inside a template or third-party scaffold.
