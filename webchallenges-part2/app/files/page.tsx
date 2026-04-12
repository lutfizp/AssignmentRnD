"use client";

import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useListFiles, useDeleteFile, getListFilesQueryKey } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  FileText, Trash2, UploadCloud, Loader2,
  File, FileImage, FileArchive, FileCode,
  FolderOpen, Eye, Download,
} from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/"))
    return { icon: FileImage, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" };
  if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("tar"))
    return { icon: FileArchive, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" };
  if (mimeType.includes("pdf"))
    return { icon: FileText, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" };
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("css") || mimeType.includes("xml") || mimeType.startsWith("text/"))
    return { icon: FileCode, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" };
  return { icon: File, color: "text-accent", bg: "bg-accent/10 border-accent/20" };
}

function getMimeLabel(mimeType: string) {
  const parts = mimeType.split("/");
  return (parts[1] || parts[0]).toUpperCase().slice(0, 6);
}

function canViewInline(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("text/");
}

function openFileView(fileId: number) {
  const url = `/file-viewer?id=${fileId}`;
  window.open(url, "_blank", "noopener");
}

async function downloadFile(fileId: number, originalName: string) {
  const token = localStorage.getItem("sv_token");
  try {
    const res = await fetch(`/api/files/${fileId}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch file");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = originalName;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Download failed");
  }
}

// Inline viewer modal
function FileViewer({ fileId, fileName, mimeType, onClose }: {
  fileId: number;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sv_token");
    fetch(`/api/files/${fileId}/view`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.blob();
      })
      .then((blob) => {
        setBlobUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [fileId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
              {getMimeLabel(mimeType)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => downloadFile(fileId, fileName)}
              className="h-7 px-3 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />Download
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 bg-black/20">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="text-sm text-muted-foreground">Loading file...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">Failed to load file</div>
          ) : blobUrl && mimeType.startsWith("image/") ? (
            <img src={blobUrl} alt={fileName} className="max-w-full max-h-full object-contain p-4" />
          ) : blobUrl && mimeType === "application/pdf" ? (
            <iframe src={blobUrl} className="w-full h-full min-h-[60vh]" title={fileName} />
          ) : blobUrl && mimeType.startsWith("text/") ? (
            <TextViewer url={blobUrl} />
          ) : (
            <div className="flex flex-col items-center gap-4 p-8">
              <File className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">This file type cannot be previewed</p>
              <button
                onClick={() => downloadFile(fileId, fileName)}
                className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 transition-all"
              >
                <Download className="w-4 h-4" />Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextViewer({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setText);
  }, [url]);
  return (
    <pre className="w-full h-full p-6 text-xs font-mono text-foreground/80 overflow-auto whitespace-pre-wrap max-h-[70vh]">
      {text ?? "Loading..."}
    </pre>
  );
}

export default function FilesPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const queryClient = useQueryClient();
  const { data: files, isLoading } = useListFiles({ query: { enabled: isAuthenticated } });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: number; name: string; mimeType: string } | null>(null);

  const deleteMutation = useDeleteFile({
    mutation: {
      onSuccess: () => {
        toast.success("File removed");
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        toast.error("Failed to delete file");
        setDeletingId(null);
      },
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("sv_token");
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      toast.success("File uploaded");
      queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Storage</p>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Files</h1>
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-2 hover:bg-accent/90 transition-all duration-150 disabled:opacity-50 shadow-[0_0_16px_hsl(28_90%_55%/0.2)] hover:shadow-[0_0_24px_hsl(28_90%_55%/0.35)]"
            >
              {isUploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading...</>
              ) : (
                <><UploadCloud className="w-3.5 h-3.5" />Upload</>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* File count summary */}
        {!isLoading && files && files.length > 0 && (
          <div className="text-xs text-muted-foreground font-mono">
            {files.length} file{files.length !== 1 ? "s" : ""} &mdash;{" "}
            {formatBytes(files.reduce((a, f) => a + f.size, 0))} total
          </div>
        )}

        {/* Files table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-border grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Name</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Type / Size</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right hidden sm:block">Date</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-right">Actions</span>
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-border last:border-0">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16 hidden sm:block" />
              </div>
            ))
          ) : files && files.length > 0 ? (
            files.map((file) => {
              const { icon: Icon, color, bg } = getFileIcon(file.mimeType);
              const canView = canViewInline(file.mimeType);
              return (
                <div key={file.id} className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-border last:border-0 group hover:bg-muted/30 transition-colors">
                  {/* File name + icon */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-sm text-foreground truncate font-medium">{file.originalName}</span>
                  </div>

                  {/* Type + size */}
                  <div className="text-right hidden sm:flex items-center gap-2 justify-end">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${bg} ${color}`}>
                      {getMimeLabel(file.mimeType)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatBytes(file.size)}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground font-mono text-right hidden sm:block">
                    {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {/* View / Download */}
                    <button
                      className={`w-7 h-7 rounded flex items-center justify-center transition-all text-muted-foreground/40 hover:bg-muted ${canView ? "hover:text-blue-400" : "hover:text-accent"} opacity-0 group-hover:opacity-100`}
                      onClick={() => {
                        if (canView) {
                          setViewingFile({ id: file.id, name: file.originalName, mimeType: file.mimeType });
                        } else {
                          downloadFile(file.id, file.originalName);
                        }
                      }}
                      title={canView ? "View file" : "Download file"}
                    >
                      {canView ? <Eye className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        setDeletingId(file.id);
                        deleteMutation.mutate({ id: file.id });
                      }}
                      disabled={deletingId === file.id}
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground">No files stored yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
              >
                Upload your first file
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File viewer modal */}
      {viewingFile && (
        <FileViewer
          fileId={viewingFile.id}
          fileName={viewingFile.name}
          mimeType={viewingFile.mimeType}
          onClose={() => setViewingFile(null)}
        />
      )}
    </Layout>
  );
}
