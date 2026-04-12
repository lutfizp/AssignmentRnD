"use client";

import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { User, Save, Loader2, ShieldCheck, Camera, UserX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function Profile() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { enabled: !!token } });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [dirty, setDirty] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio ?? "");
    }
  }, [user]);

  const updateMutation = useUpdateMe({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetMeQueryKey(), updated);
        toast.success("Profile updated");
        setDirty(false);
      },
      onError: () => {
        toast.error("Failed to update profile");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      data: {
        name: name || undefined,
        bio: bio || null,
      },
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed");
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const updated = await res.json();
      queryClient.setQueryData(getGetMeQueryKey(), updated);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="w-full space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Account</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile</h1>
        </div>

        {/* Avatar + identity card */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5">
          {isLoading ? (
            <>
              <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-20" />
              </div>
            </>
          ) : user ? (
            <>
              {/* Avatar with upload overlay */}
              <div className="relative flex-shrink-0 group">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-accent/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent tabular">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Camera overlay */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change profile photo"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>

                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-lg">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {user.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3" />USER
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Hover your photo to change it
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <UserX className="w-5 h-5" />
              <span className="text-sm">User not found</span>
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Edit details</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Display name
              </Label>
              {isLoading ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true); }}
                  className="bg-background border-border h-11 text-sm"
                  placeholder="Your name"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Bio
              </Label>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setDirty(true); }}
                  className="bg-background border-border text-sm resize-none"
                  rows={3}
                  placeholder="Tell us a bit about yourself..."
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending || !dirty}
                className="h-9 px-5 rounded-md bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_hsl(28_90%_55%/0.2)]"
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" />Save changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
