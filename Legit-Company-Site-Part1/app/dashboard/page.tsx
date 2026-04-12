"use client";

import { Layout } from "@/components/layout";
import { useGetDashboardStats } from "@/lib/api-client";
import { FolderOpen, LogIn, UploadCloud, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

function StatBlock({
  label,
  value,
  icon: Icon,
  href,
  loading,
}: {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  href: string;
  loading: boolean;
}) {
  return (
    <Link href={href}>
      <div className="group relative bg-card border border-border rounded-xl p-6 hover:border-accent/40 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Subtle glow on hover */}
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/[0.03] transition-all duration-200 rounded-xl" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-accent/60 transition-colors" />
          </div>

          {loading ? (
            <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-4xl font-bold text-foreground tabular tracking-tight">
              {(value ?? 0).toLocaleString()}
            </div>
          )}

          <div className="mt-1.5 text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</div>
        </div>
      </div>
    </Link>
  );
}

function actionColor(action: string) {
  if (action.includes("login") && !action.includes("fail")) return "text-emerald-400 bg-emerald-400/10";
  if (action.includes("fail")) return "text-red-400 bg-red-400/10";
  if (action.includes("upload")) return "text-blue-400 bg-blue-400/10";
  if (action.includes("delete")) return "text-orange-400 bg-orange-400/10";
  if (action.includes("profile") || action.includes("update")) return "text-violet-400 bg-violet-400/10";
  return "text-accent bg-accent/10";
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const { data: stats, isLoading } = useGetDashboardStats({ query: { enabled: isAuthenticated } });

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Overview</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-mono">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBlock label="Stored Files" value={stats?.totalFiles} icon={FolderOpen} href="/files" loading={isLoading} />
          <StatBlock label="Total Uploads" value={stats?.totalUploads} icon={UploadCloud} href="/files" loading={isLoading} />
          <StatBlock label="Login Events" value={stats?.totalLogins} icon={LogIn} href="/logs" loading={isLoading} />
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            </div>
            <Link href="/logs" className="text-xs text-muted-foreground hover:text-accent transition-colors font-mono">
              View all logs →
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-7 h-7 rounded bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-muted animate-pulse rounded w-32" />
                      <div className="h-3 bg-muted animate-pulse rounded w-56" />
                    </div>
                    <div className="h-3 bg-muted animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="divide-y divide-border">
                {stats.recentActivity.map((log) => {
                  const colorClass = actionColor(log.action);
                  return (
                    <div key={log.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorClass.split(" ")[0]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${colorClass}`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {log.userEmail ? log.userEmail : "system"}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{log.detail}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
