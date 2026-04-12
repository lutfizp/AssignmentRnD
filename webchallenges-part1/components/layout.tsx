"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  FolderOpen,
  ScrollText,
  User,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Lock,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/logs", label: "Audit Log", icon: ScrollText },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/admin", label: "Admin", icon: Lock, adminOnly: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden">
      {/* Narrow icon rail sidebar */}
      <aside className="hidden md:flex w-[60px] flex-shrink-0 flex-col items-center bg-sidebar border-r border-sidebar-border py-4 z-30 shadow-xl">
        {/* Logo mark */}
        <div className="mb-8 w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-accent-foreground" strokeWidth={2.5} />
        </div>

        {/* Nav icons */}
        <nav className="flex flex-col items-center gap-1 flex-1 w-full">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div
                key={item.href}
                className="relative w-full flex items-center justify-center py-1"
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
              >
                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-accent rounded-r-full z-10" />
                )}
                <Link
                  href={item.href}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 z-20 ${
                    isActive
                      ? "bg-accent/10 text-accent shadow-[0_0_10px_rgba(var(--primary),0.1)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[2]"}`} />
                </Link>

                {/* Tooltip */}
                {hovered === item.label && (
                  <div
                    className="absolute left-14 bg-popover text-popover-foreground text-xs font-semibold
                      px-3 py-1.5 rounded-md shadow-lg border border-border flex items-center gap-1.5
                      z-[100] whitespace-nowrap font-mono pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150"
                  >
                    {item.label}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom profile / logout */}
        <div className="mt-auto flex flex-col items-center gap-3 w-full">
          <div
            className="relative w-full flex items-center justify-center py-1"
            onMouseEnter={() => setHovered("Sign Out")}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={logout}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 z-20"
            >
              <LogOut className="w-5 h-5 stroke-[2]" />
            </button>

            {hovered === "Sign Out" && (
              <div
                className="absolute left-14 bg-popover text-popover-foreground text-xs font-semibold
                  px-3 py-1.5 rounded-md shadow-lg border border-border flex items-center gap-1.5
                  z-[100] whitespace-nowrap font-mono pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150"
              >
                Sign Out
                <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        <div className="flex-1 p-4 md:p-8 lg:p-10 w-full">
          {/* Mobile nav header */}
          <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-accent-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm tracking-widest uppercase font-mono">NexaCore</span>
            </div>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile nav pills */}
          <div className="md:hidden flex overflow-x-auto pb-4 mb-6 -mx-4 px-4 hide-scrollbar gap-2">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors border ${
                    isActive
                      ? "bg-accent/10 border-accent/20 text-accent"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="w-full relative animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
