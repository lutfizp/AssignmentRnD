"use client";

import { Layout } from "@/components/layout";
import { useAdminListUsers, useAdminUpdateUser, getAdminListUsersQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, User as UserIcon, Loader2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function Admin() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user) {
        if (user.role !== "admin") {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, user, router, isAuthLoading]);

  const queryClient = useQueryClient();
  const { data: users, isLoading: isUsersLoading } = useAdminListUsers({ 
    query: { enabled: isAuthenticated && user?.role === "admin" } 
  });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const updateMutation = useAdminUpdateUser({
    mutation: {
      onSuccess: () => {
        toast.success("User role updated");
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        setUpdatingId(null);
      },
      onError: () => {
        toast.error("Failed to update user");
        setUpdatingId(null);
      },
    },
  });

  const toggleRole = (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setUpdatingId(userId);
    updateMutation.mutate({ id: userId, data: { role: newRole } });
  };

  if (isAuthLoading) {
    return (
      <Layout>
        <div className="w-full flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <Layout>
      <div className="w-full space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">System</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Panel</h1>
          </div>
          {!isUsersLoading && users && (
            <div className="text-xs text-muted-foreground font-mono">
              {users.length} user{users.length !== 1 ? "s" : ""} total
            </div>
          )}
        </div>

        {/* Warning banner */}
        <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
          <Lock className="w-4 h-4 text-accent flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Admin-only area. Role changes take effect immediately and are logged.
          </p>
        </div>

        {/* Users table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">User</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Joined</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right">Role</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right">Action</span>
          </div>

          {isUsersLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-border last:border-0">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))
          ) : users && users.length > 0 ? (
            users.map((u) => (
              <div
                key={u.id}
                className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                {/* User info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    u.role === "admin"
                      ? "bg-accent/15 border border-accent/30 text-accent"
                      : "bg-muted border border-border text-muted-foreground"
                  }`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">{u.email}</div>
                  </div>
                </div>

                {/* Joined date */}
                <span className="text-xs text-muted-foreground font-mono text-right hidden sm:block">
                  {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                </span>

                {/* Role badge */}
                <div className="text-right">
                  {u.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                      <UserIcon className="w-3 h-3" />USER
                    </span>
                  )}
                </div>

                {/* Toggle action */}
                <div className="text-right">
                  <button
                    onClick={() => toggleRole(u.id, u.role)}
                    disabled={updatingId === u.id}
                    className={`h-7 px-3 rounded text-[10px] font-mono font-semibold transition-all duration-150 disabled:opacity-50 ${
                      u.role === "admin"
                        ? "bg-muted hover:bg-muted/80 text-muted-foreground border border-border"
                        : "bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20"
                    }`}
                  >
                    {updatingId === u.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : u.role === "admin" ? (
                      "Demote"
                    ) : (
                      "Promote"
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">No users found</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
