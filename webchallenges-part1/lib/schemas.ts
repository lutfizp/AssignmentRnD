import * as zod from "zod";

/**
 * Returns server health status
 * @summary Health check
 */
export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

/**
 * @summary Register new user
 */
export const registerBodyPasswordMin = 6;

export const RegisterBody = zod.object({
  name: zod.string(),
  email: zod.string().email(),
  password: zod.string().min(registerBodyPasswordMin),
});

/**
 * @summary Login
 */
export const LoginBody = zod.object({
  email: zod.string().email(),
  password: zod.string(),
});

export const LoginResponse = zod.object({
  token: zod.string(),
  user: zod.object({
    id: zod.number(),
    name: zod.string(),
    email: zod.string(),
    role: zod.enum(["user", "admin"]),
    bio: zod.string().nullish(),
    avatarUrl: zod.string().nullish(),
    createdAt: zod.coerce.date(),
  }),
});

/**
 * @summary Get current user profile
 */
export const GetMeResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["user", "admin"]),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  createdAt: zod.coerce.date(),
});

/**
 * @summary Update current user profile
 */
export const UpdateMeBody = zod.object({
  name: zod.string().optional(),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
});

export const UpdateMeResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["user", "admin"]),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  createdAt: zod.coerce.date(),
});

/**
 * @summary List user's files
 */
export const ListFilesResponseItem = zod.object({
  id: zod.number(),
  userId: zod.number(),
  filename: zod.string(),
  originalName: zod.string(),
  mimeType: zod.string(),
  size: zod.number(),
  path: zod.string(),
  createdAt: zod.coerce.date(),
});
export const ListFilesResponse = zod.array(ListFilesResponseItem);

/**
 * @summary Upload a file
 */
export const UploadFileBody = zod.object({
  file: zod.any(), // Changed from zod.instanceof(File) to allow Next.js form data parsing
});

/**
 * @summary Get file metadata
 */
export const GetFileParams = zod.object({
  id: zod.coerce.number(),
});

export const GetFileResponse = zod.object({
  id: zod.number(),
  userId: zod.number(),
  filename: zod.string(),
  originalName: zod.string(),
  mimeType: zod.string(),
  size: zod.number(),
  path: zod.string(),
  createdAt: zod.coerce.date(),
});

/**
 * @summary Delete a file
 */
export const DeleteFileParams = zod.object({
  id: zod.coerce.number(),
});

/**
 * @summary List all users (admin only)
 */
export const AdminListUsersResponseItem = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["user", "admin"]),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  createdAt: zod.coerce.date(),
});
export const AdminListUsersResponse = zod.array(AdminListUsersResponseItem);

/**
 * @summary Update user role or status (admin only)
 */
export const AdminUpdateUserParams = zod.object({
  id: zod.coerce.number(),
});

export const AdminUpdateUserBody = zod.object({
  role: zod.enum(["user", "admin"]).optional(),
});

export const AdminUpdateUserResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["user", "admin"]),
  bio: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  createdAt: zod.coerce.date(),
});

/**
 * @summary Get activity logs (admin sees all, user sees own)
 */
export const GetLogsResponseItem = zod.object({
  id: zod.number(),
  userId: zod.number().nullish(),
  action: zod.string(),
  detail: zod.string().nullish(),
  ipAddress: zod.string().nullish(),
  createdAt: zod.coerce.date(),
  userEmail: zod.string().nullish(),
});
export const GetLogsResponse = zod.array(GetLogsResponseItem);

/**
 * @summary Get dashboard statistics
 */
export const GetDashboardStatsResponse = zod.object({
  totalFiles: zod.number(),
  totalLogins: zod.number(),
  totalUploads: zod.number(),
  recentActivity: zod.array(
    zod.object({
      id: zod.number(),
      userId: zod.number().nullish(),
      action: zod.string(),
      detail: zod.string().nullish(),
      ipAddress: zod.string().nullish(),
      createdAt: zod.coerce.date(),
      userEmail: zod.string().nullish(),
    }),
  ),
});
