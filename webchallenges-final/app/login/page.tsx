"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data);
        toast.success("Access granted");
        router.push("/dashboard");
      },
      onError: () => {
        toast.error("Invalid credentials — access denied");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand/visual */}
      <div className="hidden lg:flex w-1/2 bg-sidebar relative overflow-hidden flex-col">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-60" />
        {/* Accent glow */}
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm tracking-widest uppercase text-foreground font-mono">
              NexaCore
            </span>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[11px] font-mono text-accent tracking-wider">ENTERPRISE PLATFORM</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
              Secure file management<br />
              <span className="text-accent">built for teams.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              End-to-end access control, full audit logging, and role-based permissions — so you always know who did what and when.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-3">
              {["JWT-secured authentication", "Role-based access control", "Full audit trail on all actions"].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="text-[11px] text-muted-foreground/40 font-mono">
            v2.0.0 — All systems operational
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm font-mono tracking-widest uppercase">NexaCore</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loginMutation.isPending}
                className="bg-card border-border focus:border-accent h-11 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loginMutation.isPending}
                className="bg-card border-border focus:border-accent h-11 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="
                w-full h-11 rounded-md bg-accent text-accent-foreground font-semibold text-sm
                flex items-center justify-center gap-2
                hover:bg-accent/90 transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-[0_0_20px_hsl(28_90%_55%/0.25)]
                hover:shadow-[0_0_30px_hsl(28_90%_55%/0.4)]
              "
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <span className="text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-accent hover:text-accent/80 font-medium transition-colors">
                Request access
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
