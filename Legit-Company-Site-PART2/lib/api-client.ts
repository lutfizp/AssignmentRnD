import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import * as schemas from "./schemas";
import { z } from "zod";

export type User = z.infer<typeof schemas.GetMeResponse>;
export type AuthResponse = z.infer<typeof schemas.LoginResponse>;
export type ActivityLog = z.infer<typeof schemas.GetLogsResponseItem>;

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("sv_token") : null;
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { ...errorData, status: response.status };
  }
  return response.json();
};

type QueryOptions<T> = Omit<UseQueryOptions<T, Error, T, any[]>, "queryKey" | "queryFn">;

export function useLogin(options?: { mutation?: UseMutationOptions<AuthResponse, any, { data: z.infer<typeof schemas.LoginBody> }> }) {
  return useMutation({
    mutationFn: ({ data }) => customFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    ...options?.mutation,
  });
}

export function useRegister(options?: { mutation?: UseMutationOptions<AuthResponse, any, { data: z.infer<typeof schemas.RegisterBody> }> }) {
  return useMutation({
    mutationFn: ({ data }) => customFetch<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    ...options?.mutation,
  });
}

export function useGetDashboardStats(options?: { query?: QueryOptions<z.infer<typeof schemas.GetDashboardStatsResponse>> }) {
  return useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => customFetch<z.infer<typeof schemas.GetDashboardStatsResponse>>("/api/dashboard/stats"),
    ...options?.query,
  });
}

export function getGetMeQueryKey() {
  return ["/api/users/me"];
}

export function useGetMe(options?: { query?: QueryOptions<User> }) {
  return useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: () => customFetch<User>("/api/users/me"),
    ...options?.query,
  });
}

export function useUpdateMe(options?: { mutation?: UseMutationOptions<z.infer<typeof schemas.UpdateMeResponse>, any, { data: z.infer<typeof schemas.UpdateMeBody> }> }) {
  return useMutation({
    mutationFn: ({ data }) => customFetch<z.infer<typeof schemas.UpdateMeResponse>>("/api/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    ...options?.mutation,
  });
}

export function getListFilesQueryKey() {
  return ["/api/files"];
}

export function useListFiles(options?: { query?: QueryOptions<z.infer<typeof schemas.ListFilesResponse>> }) {
  return useQuery({
    queryKey: getListFilesQueryKey(),
    queryFn: () => customFetch<z.infer<typeof schemas.ListFilesResponse>>("/api/files"),
    ...options?.query,
  });
}

export function useDeleteFile(options?: { mutation?: UseMutationOptions<void, any, { id: number }> }) {
  return useMutation({
    mutationFn: ({ id }) => customFetch<void>(`/api/files/${id}`, { method: "DELETE" }),
    ...options?.mutation,
  });
}

export function getAdminListUsersQueryKey() {
  return ["/api/admin/users"];
}

export function useAdminListUsers(options?: { query?: QueryOptions<z.infer<typeof schemas.AdminListUsersResponse>> }) {
  return useQuery({
    queryKey: getAdminListUsersQueryKey(),
    queryFn: () => customFetch<z.infer<typeof schemas.AdminListUsersResponse>>("/api/admin/users"),
    ...options?.query,
  });
}

export function useAdminUpdateUser(options?: { mutation?: UseMutationOptions<z.infer<typeof schemas.AdminUpdateUserResponse>, any, { id: number, data: z.infer<typeof schemas.AdminUpdateUserBody> }> }) {
  return useMutation({
    mutationFn: ({ id, data }) => customFetch<z.infer<typeof schemas.AdminUpdateUserResponse>>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    ...options?.mutation,
  });
}
