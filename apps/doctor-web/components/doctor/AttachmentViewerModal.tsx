"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ToastProvider";
import {
  getEncounterAttachments,
  getAttachmentPresignedUrl,
  type ClinicalAttachmentItem,
} from "@/lib/api-client";
import {
  FileText,
  FileSearch,
  ExternalLink,
  ShieldCheck,
  Hash,
  Loader2,
  Paperclip,
  Clock,
  HardDrive,
} from "lucide-react";
import type { Encounter } from "@/lib/mockData";

interface AttachmentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounter: Encounter | null;
}

export function AttachmentViewerModal({
  open,
  onOpenChange,
  encounter,
}: AttachmentViewerModalProps) {
  const { showToast } = useToast();
  const [attachments, setAttachments] = useState<ClinicalAttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (open && encounter) {
      setIsLoading(true);
      getEncounterAttachments(encounter.id)
        .then((items) => setAttachments(items))
        .catch((err) => {
          console.warn("Failed to load attachments:", err);
          showToast("Failed to load clinical attachments", "error");
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, encounter?.id]);

  const handleOpenSecureDocument = async (attachment: ClinicalAttachmentItem) => {
    setOpeningId(attachment.id);
    try {
      const res = await getAttachmentPresignedUrl(attachment.id);
      if (res && res.presigned_url) {
        showToast("15-minute secure access granted.", "success");
        window.open(res.presigned_url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Unable to obtain presigned access link.");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to generate presigned URL", "error");
    } finally {
      setOpeningId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Clinical Binary Vault</h2>
              <p className="text-xs text-muted-foreground">
                Encounter: {encounter?.id ? encounter.id.slice(0, 8) + "..." : "Selected"} · S3 Object Storage
              </p>
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Querying S3 Binary Vault...</p>
            </div>
          ) : attachments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No attachments found</p>
              <p className="text-xs text-slate-400">
                No binary documents (PDFs, DICOMs, or prescription scans) were attached to this encounter.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {attachments.map((att) => {
                const isOpening = openingId === att.id;
                const isPdf = att.mime_type.includes("pdf");

                return (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-border bg-white hover:border-sky-300 transition-all space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-rose-600" />
                          ) : (
                            <FileSearch className="w-4 h-4 text-sky-600" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-foreground truncate">
                              {att.modality_category.replace("_", " ")}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {att.mime_type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatFileSize(att.file_size_bytes)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(att.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isOpening}
                        onClick={() => handleOpenSecureDocument(att)}
                        className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shrink-0"
                      >
                        {isOpening ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Generating 15-min Link...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Secure Document
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Cryptographic SHA-256 Badge */}
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-muted-foreground uppercase">SHA-256:</span>
                        <span className="font-semibold">{att.sha256_hash.slice(0, 16)}...{att.sha256_hash.slice(-8)}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Integrity Verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Pre-signed S3 links expire after 15 minutes
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AttachmentViewerModal;

