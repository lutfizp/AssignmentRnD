"use client";

import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { customFetch, ActivityLog } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Monitor, Clock, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const ACTION_META: Record<string, { label: string; color: string; group: string }> = {
  login:                { label: "LOGIN",              color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",  group: "auth"     },
  login_failed:         { label: "LOGIN FAILED",       color: "text-red-400 bg-red-400/10 border-red-400/20",             group: "threat"   },
  register:             { label: "REGISTER",           color: "text-blue-400 bg-blue-400/10 border-blue-400/20",          group: "auth"     },
  file_upload:          { label: "UPLOAD",             color: "text-violet-400 bg-violet-400/10 border-violet-400/20",    group: "files"    },
  file_view:            { label: "VIEW",               color: "text-sky-400 bg-sky-400/10 border-sky-400/20",             group: "files"    },
  file_delete:          { label: "DELETE",             color: "text-orange-400 bg-orange-400/10 border-orange-400/20",    group: "files"    },
  file_access_denied:   { label: "ACCESS DENIED",      color: "text-red-500 bg-red-500/10 border-red-500/20",             group: "threat"   },
  profile_update:       { label: "PROFILE",            color: "text-accent bg-accent/10 border-accent/20",                group: "account"  },
  avatar_upload:        { label: "AVATAR",             color: "text-accent bg-accent/10 border-accent/20",                group: "account"  },
  admin_list_users:     { label: "ADMIN VIEW",         color: "text-purple-400 bg-purple-400/10 border-purple-400/20",    group: "admin"    },
  admin_user_update:    { label: "ADMIN EDIT",         color: "text-purple-500 bg-purple-500/10 border-purple-500/20",    group: "admin"    },
  unauthorized_access:  { label: "UNAUTHORIZED",       color: "text-red-400 bg-red-400/15 border-red-400/30",             group: "threat"   },
  forbidden_access:     { label: "FORBIDDEN",          color: "text-red-500 bg-red-500/15 border-red-500/30",             group: "threat"   },
  unknown_route:        { label: "404 PROBE",          color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",    group: "threat"   },
};

const GROUPS = [
  { id: "all",     label: "All"      },
  { id: "threat",  label: "Threats"  },
  { id: "auth",    label: "Auth"     },
  { id: "files",   label: "Files"    },
  { id: "admin",   label: "Admin"    },
  { id: "account", label: "Account"  },
];

function getMeta(action: string) {
  return ACTION_META[action] ?? {
    label: action.replace(/_/g, " ").toUpperCase(),
    color: "text-muted-foreground bg-muted border-border",
    group: "other",
  };
}

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function Logs() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const [filter, setFilter] = useState("all");

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/logs"],
    queryFn: ({ signal }) => customFetch<ActivityLog[]>("/api/logs", { method: "GET", signal }),
    enabled: isAuthenticated,
  });

  const filtered = logs?.filter((log) => {
    if (filter === "all") return true;
    return getMeta(log.action).group === filter;
  });

  const threatCount = logs?.filter((l) => getMeta(l.action).group === "threat").length ?? 0;

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Security</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Audit Log</h1>
          </div>
          <div className="flex items-center gap-4">
            {threatCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-mono text-red-400">{threatCount} threat event{threatCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {!isLoading && logs && (
              <div className="text-xs text-muted-foreground font-mono">{logs.length} total events</div>
            )}
          </div>
        </div>

        {/* Group filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {GROUPS.map((g) => {
            const count = g.id === "all" ? logs?.length : logs?.filter((l) => getMeta(l.action).group === g.id).length;
            return (
              <button
                key={g.id}
                onClick={() => setFilter(g.id)}
                className={`h-7 px-3 rounded-md text-[11px] font-mono transition-all duration-150 flex items-center gap-1.5 ${
                  filter === g.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-accent/30"
                }`}
              >
                {g.label}
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] ${filter === g.id ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Log table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="px-5 py-3 border-b border-border grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Event</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Detail</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Source IP</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right">When</span>
          </div>

          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4 border-b border-border last:border-0">
                <Skeleton className="h-5 w-24 flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24 hidden sm:block" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : filtered && filtered.length > 0 ? (
            filtered.map((log) => {
              const meta = getMeta(log.action);
              const isThreat = meta.group === "threat";
              return (
                <div
                  key={log.id}
                  className={`px-5 py-3 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center border-b border-border last:border-0 transition-colors ${
                    isThreat ? "hover:bg-red-500/5" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Event badge */}
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${meta.color}`}>
                    {meta.label}
                  </span>

                  {/* Detail */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {log.detail ? (
                        <span className="text-xs text-muted-foreground truncate block">{log.detail}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.userEmail ? (
                        <span className="text-[10px] text-accent/70 font-mono">{log.userEmail}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40 font-mono">system</span>
                      )}
                      {log.userId && (
                        <span className="text-[10px] text-muted-foreground/30 font-mono">id:{log.userId}</span>
                      )}
                    </div>
                  </div>

                  {/* IP */}
                  <div className="text-right hidden sm:flex items-center gap-1.5 justify-end text-xs text-muted-foreground/50 font-mono">
                    {log.ipAddress ? (
                      <>
                        <Monitor className="w-3 h-3" />
                        {log.ipAddress}
                      </>
                    ) : (
                      <span className="text-muted-foreground/20">—</span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-right flex items-center gap-1.5 justify-end text-xs text-muted-foreground font-mono whitespace-nowrap">
                    <Clock className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                    {timeAgo(log.createdAt)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center">
              <ScrollText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === "all" ? "No activity logged yet" : `No ${filter} events found`}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
