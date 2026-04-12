# WebChallenges Final

This folder contains the final remediated build of the challenge application. It keeps the functionality introduced in the earlier stages, but applies an extra patch specifically to remove the `React2Shell` attack surface from this final version.

## Features

- **Authentication System** - JWT-based registration and login with bcrypt password hashing
- **Role-Based Access Control (RBAC)** - Secure separation between `user` and `admin` roles
- **User Profiles** - Editable profile details with avatar support
- **File Upload System** - File storage with metadata persisted in PostgreSQL
- **REST API Layer** - JSON endpoints for authentication, profile management, file handling, and audit access
- **Audit Logging** - Login attempts, profile updates, and file actions are recorded with request context
- **Security Hardening** - Includes the Part 2 controls plus a final runtime patch against `React2Shell`
- **Modern UI** - Responsive interface built with Tailwind CSS and Radix UI

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI Library | React 19 + Radix UI + Lucide Icons |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| State Management | TanStack Query |
| Container | Docker + Docker Compose |

## Final-Specific Security Note

The final build is the only version patched to block `React2Shell`-style requests.

The remediation is intentionally scoped here so the repository still preserves the Part 1 and Part 2 progression for review. In this final build:

- React Server Actions are not used by the application
- the `Next-Action` execution surface is blocked in middleware
- the final config no longer enables experimental `serverActions`
- the framework dependency is pinned to the patched `next@15.1.11` release line

## Quick Start with Docker

Docker is the fastest way to run the full stack with the expected defaults.

```bash
docker-compose up --build -d
```

Application URL:

```text
http://localhost:3000
```

The first startup also runs schema creation through the `migrate` service.

### Seeded Database

The repository includes a PostgreSQL seed at `docker/init/001-seed.sql`.

- On a fresh Docker volume, PostgreSQL imports it automatically
- If you already have a `postgres_data` volume, the init script will not run again
- To reinitialize from the checked-in seed:

```bash
docker-compose down -v
docker-compose up --build -d
```

### Creating an Admin Account in Docker

1. Register an account at `http://localhost:3000/register`
2. Promote it with:

```bash
docker-compose exec db psql -U sv_adminnexacore -d securevault -c \
  "UPDATE users SET role='admin' WHERE email='admin@nexacore.com';"
```

## Running Without Docker

The project can also run directly on your machine. The application code does not depend on Docker, but it does require:

- Node.js 20 or newer
- npm or pnpm
- PostgreSQL running locally

### 1. Install Dependencies

From the project directory:

```bash
npm install
```

If you prefer pnpm, this project also works with:

```bash
pnpm install
```

### 2. Prepare the Environment File

Copy `.env.example` to `.env`, then update the database connection so it points to your local PostgreSQL instance instead of the Docker service name `db`.

Example local configuration:

```env
DATABASE_URL=postgresql://sv_adminnexacore:sv_nexacore05@localhost:5432/securevault
POSTGRES_DB=securevault
POSTGRES_USER=sv_adminnexacore
POSTGRES_PASSWORD=sv_nexacore05
SESSION_SECRET=change-this-to-a-long-random-secret
NODE_ENV=development
PORT=3000
```

### 3. Create the Local Database

Create a PostgreSQL database that matches the connection string. For example:

```bash
createdb securevault
```

If your local PostgreSQL user does not already exist, create it first or adjust `DATABASE_URL` to use a user that does exist.

### 4. Initialize the Schema

You have two valid local options.

If you want an empty database with the current schema only:

```bash
npm run db:push
```

If you want the checked-in seed data and schema:

```bash
psql postgresql://sv_adminnexacore:sv_nexacore05@localhost:5432/securevault -f docker/init/001-seed.sql
```

Use one approach or the other. You do not need both.

### 5. Start the Application

For local development:

```bash
npm run dev
```

For a production-style local run:

```bash
npm run build
npm run start
```

The app will be available at:

```text
http://localhost:3000
```

### 6. Creating an Admin Account Without Docker

1. Register an account in the app
2. Promote it with:

```bash
psql postgresql://sv_adminnexacore:sv_nexacore05@localhost:5432/securevault -c \
  "UPDATE users SET role='admin' WHERE email='admin@nexacore.com';"
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | - | Register a new user |
| POST | `/api/auth/login` | - | Login and return a JWT |
| GET | `/api/users/me` | User | Get the current user's profile |
| PATCH | `/api/users/me` | User | Update the current user's profile |
| GET | `/api/files` | User | List the current user's files |
| POST | `/api/files` | User | Upload a file |
| DELETE | `/api/files/:id` | User | Delete a file owned by the current user |
| GET | `/api/logs` | User/Admin | View activity logs |
| GET | `/api/admin/users` | Admin | List all users |

## Project Structure

```text
.
|-- app/                # Next.js routes and API handlers
|-- components/         # Shared UI components
|-- hooks/              # Custom React hooks
|-- lib/                # Shared application logic
|   |-- db/             # Database schema and Drizzle setup
|   |-- auth.ts         # JWT and authorization helpers
|   |-- activityLogger.ts
|   |-- uploads.ts      # Upload validation and safe storage helpers
|   |-- rate-limit.ts   # Request throttling
|   |-- security.ts     # Sanitization and request security helpers
|-- docker/             # Docker init and seed files
|-- Dockerfile
`-- docker-compose.yml
```

## Security and Reliability Notes

- Passwords are hashed with `bcryptjs`
- JWT-based authentication protects API access
- PostgreSQL stores users, files, and activity logs
- TypeScript is used across frontend, backend, and schema definitions
- The app creates upload directories on demand during file operations
- Part 2 adds upload validation, stricter input handling, safer file access, and rate limiting on sensitive routes

## Documentation

For the final build summary and the remediation notes, see:

- [DOCUMENTATION.md](https://github.com/lutfizp/AssignmentRnD/blob/master/webchallenges-final/DOCUMENTATION.md)
- [Root README](https://github.com/lutfizp/AssignmentRnD/blob/master/README.md)
