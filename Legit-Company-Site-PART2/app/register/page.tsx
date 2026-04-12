"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data);
        toast.success("Account created — welcome aboard");
        router.push("/dashboard");
      },
      onError: (err: any) => {
        toast.error(err?.error || "Registration failed");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { name, email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-accent-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm font-mono tracking-widest uppercase">NexaCore</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Create account</h2>
          <p className="text-sm text-muted-foreground mt-1">Fill in your details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Full name
            </Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={registerMutation.isPending}
              className="bg-card border-border h-11 text-sm"
            />
          </div>
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
              disabled={registerMutation.isPending}
              className="bg-card border-border h-11 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={registerMutation.isPending}
              className="bg-card border-border h-11 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full h-11 rounded-md bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_hsl(28_90%_55%/0.25)] hover:shadow-[0_0_30px_hsl(28_90%_55%/0.4)]"
          >
            {registerMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
            ) : (
              <>Create account<ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <span className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:text-accent/80 font-medium transition-colors">
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
