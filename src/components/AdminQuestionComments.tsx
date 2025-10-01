"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, ClipboardEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const COMMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type AdminQuestionComment = {
  id: string;
  authorName: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  createdByRole?: "MEMBER" | "ADMIN" | "MASTER_ADMIN" | null;
  createdByEmail?: string | null;
  createdByGradYear?: number | null;
  origin?: "runner" | "editor" | null;
};

interface Props {
  questionId: string;
}

export default function AdminQuestionComments({ questionId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [comments, setComments] = useState<AdminQuestionComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [draftName, setDraftName] = useState<string>("");
  const [draftBody, setDraftBody] = useState<string>("");
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userRole, setUserRole] = useState<"MEMBER" | "ADMIN" | "MASTER_ADMIN" | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const absoluteFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(undefined, {
        numeric: "auto",
      }),
    []
  );

  const formatRelativeTime = useCallback(
    (iso: string) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
      const absSeconds = Math.abs(diffSeconds);
      if (absSeconds < 60) return relativeFormatter.format(diffSeconds, "second");
      if (absSeconds < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
      if (absSeconds < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
      if (absSeconds < 604800) return relativeFormatter.format(Math.round(diffSeconds / 86400), "day");
      if (absSeconds < 2629800) return relativeFormatter.format(Math.round(diffSeconds / 604800), "week");
      if (absSeconds < 31557600) return relativeFormatter.format(Math.round(diffSeconds / 2629800), "month");
      return relativeFormatter.format(Math.round(diffSeconds / 31557600), "year");
    },
    [relativeFormatter]
  );

  const setDefaultName = useCallback(
    (candidate: string | null | undefined, fallbackEmail?: string) => {
      const resolved = candidate?.trim() || fallbackEmail || "Admin Team";
      setDraftName((prev) => (prev.trim().length ? prev : resolved));
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/role", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Unable to load your profile");
        }
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
          role?: "MEMBER" | "ADMIN" | "MASTER_ADMIN";
          name?: string | null;
          firstName?: string | null;
          lastName?: string | null;
        };
        if (cancelled) return;
        setUserRole(data?.role ?? null);
        setUserEmail(data?.email ?? "");
        const candidateName = data?.name
          || [data?.firstName, data?.lastName]
            .filter((part) => typeof part === "string" && (part ?? "").trim().length > 0)
            .join(" ")
            .trim();
        setDefaultName(candidateName, data?.email);
      } catch (err) {
        if (cancelled) return;
        setWarning(
          (err instanceof Error && err.message) ||
            "We could not load your profile details. Posting will use the default author name."
        );
        setDefaultName(null, userEmail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setDefaultName, userEmail]);

  const loadComments = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/questions/${questionId}/comments`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as {
        comments?: AdminQuestionComment[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to load comments");
      }
      const items = Array.isArray(payload?.comments)
        ? payload.comments.map((comment) => ({
            ...comment,
            authorName: comment.authorName ?? "Previous Batch",
            origin: comment.origin ?? "runner",
          }))
        : [];
      setComments(items);
      setStatus("loaded");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error && err.message ? err.message : "Unable to load comments");
    }
  }, [questionId]);

  useEffect(() => {
    loadComments().catch(() => {
      /* handled in loadComments */
    });
  }, [loadComments]);

  useEffect(() => {
    if (!previewImageUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImageUrl(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImageUrl]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadImage = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setDraftError("Only image files are supported.");
      return;
    }
    if (file.size > COMMENT_IMAGE_MAX_BYTES) {
      setDraftError("Image is too large (5 MB max).");
      return;
    }

    setIsUploading(true);
    setDraftError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "comments");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Upload failed");
      }
      if (!payload?.url) {
        throw new Error("Upload did not return an image URL");
      }

      setDraftImageUrl(payload.url);
    } catch (err) {
      setDraftError(err instanceof Error && err.message ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      await uploadImage(file);
      event.target.value = "";
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      const file = files.find((f) => f.type.startsWith("image/"));
      await uploadImage(file);
    },
    [uploadImage]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handlePaste = useCallback(
    async (event: ClipboardEvent<Element>) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const item = items.find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      event.preventDefault();
      await uploadImage(file);
    },
    [uploadImage]
  );

  const handleSubmit = useCallback(async () => {
    const trimmedBody = draftBody.trim();
    if (!trimmedBody && !draftImageUrl) {
      setDraftError("Add a note or attach an image before posting.");
      return;
    }
    setIsSubmitting(true);
    setDraftError(null);

    try {
      const res = await fetch(`/api/questions/${questionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmedBody,
          imageUrl: draftImageUrl,
          authorName: draftName.trim() || "Admin Team",
          origin: "editor",
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error ?? "Failed to post comment");
      }

      const payload = (await res.json().catch(() => ({}))) as { comment?: AdminQuestionComment };
      if (!payload?.comment) throw new Error("Unexpected response from server");

      const fallbackAuthorName = draftName.trim() || "Admin Team";
      const saved: AdminQuestionComment = {
        ...payload.comment,
        authorName: payload.comment.authorName ?? fallbackAuthorName,
        origin: payload.comment.origin ?? "editor",
      };

      setComments((prev) => [saved, ...prev]);
      setDraftBody("");
      setDraftImageUrl(null);
    } catch (err) {
      setDraftError(err instanceof Error && err.message ? err.message : "Unable to post comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [draftBody, draftImageUrl, draftName, questionId]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      const confirmed = window.confirm("Delete this comment? This action cannot be undone.");
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/questions/${questionId}/comments/${commentId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload?.error ?? "Failed to delete comment");
        }
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Unable to delete comment");
      }
    },
    [questionId]
  );

  const canDelete = useCallback(
    (comment: AdminQuestionComment) => {
      if (!comment) return false;
      if (comment.createdByEmail && userEmail && comment.createdByEmail === userEmail) return true;
      if (userRole === "ADMIN" || userRole === "MASTER_ADMIN") return true;
      return false;
    },
    [userEmail, userRole]
  );

  const commentCount = comments.length;
  const uploadLimitMb = Math.round(COMMENT_IMAGE_MAX_BYTES / (1024 * 1024));

  return (
    <div className="rounded-2xl border border-[#E6F0F7] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#2F6F8F]">Student Comments</h3>
          <p className="text-xs text-slate-500">
            {commentCount} {commentCount === 1 ? "comment" : "comments"} for this question.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadComments().catch(() => {
                /* handled internally */
              });
            }}
            disabled={status === "loading"}
            className="rounded-xl border border-[#E6F0F7] bg-white px-3 py-1.5 text-xs font-medium text-[#2F6F8F] transition hover:bg-[#F3F9FC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {warning ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {warning}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
        {status === "loading" && comments.length === 0 ? (
          <div className="rounded-xl border border-[#E6F0F7] bg-[#F8FBFD] px-3 py-2 text-sm text-slate-600">
            Loading comments…
          </div>
        ) : null}

        {comments.map((comment) => {
          const created = new Date(comment.createdAt);
          const absolute = Number.isNaN(created.getTime()) ? "" : absoluteFormatter.format(created);
          const relative = formatRelativeTime(comment.createdAt);
          const isStaff = comment.createdByRole === "ADMIN" || comment.createdByRole === "MASTER_ADMIN";
          const gradLabel =
            typeof comment.createdByGradYear === "number" && Number.isFinite(comment.createdByGradYear)
              ? `Class of < ${comment.createdByGradYear}`
              : null;
          
          let pillLabel: string | null = null;
          let cohortLabel: string;
          let displayName: string;

          if (isStaff && comment.origin === "editor") {
            // Admin adding comment from editor (previous batch comments)
            pillLabel = "Previous Batch";
            cohortLabel = gradLabel ?? "Class of < 2027";
            displayName = comment.authorName || "Previous Batch Student";
          } else if (isStaff && comment.origin === "runner") {
            // Admin posting directly from quiz runner - hide identity
            pillLabel = "Member";
            cohortLabel = gradLabel ?? "Member";
            displayName = comment.authorName || "Study Partner";
          } else {
            // Regular student comment
            pillLabel = null;
            cohortLabel = gradLabel ?? "Previous Batches";
            displayName = comment.authorName || "Study Partner";
          }
          return (
            <div key={comment.id} className="rounded-2xl border border-[#E6F0F7] bg-[#F9FCFF] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2F6F8F]">
                    <span>{displayName}</span>
                    {pillLabel ? (
                      <span className="rounded-full bg-[#2F6F8F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {pillLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{cohortLabel}</span>
                    {absolute && <span>{absolute}</span>}
                    {relative && <span>· {relative}</span>}
                    {comment.createdByEmail && (
                      <span className="truncate text-[10px] text-slate-400">{comment.createdByEmail}</span>
                    )}
                  </div>
                </div>
                {canDelete(comment) ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs font-medium text-[#e11d48] underline underline-offset-2 hover:text-[#be123c]"
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              {comment.body ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
                  {comment.body}
                </p>
              ) : null}

              {comment.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(comment.imageUrl!)}
                  className="group relative mt-3 block overflow-hidden rounded-xl border border-[#E6F0F7] bg-[#F8FBFD]"
                >
                  <div className="relative h-48 w-full">
                    <img
                      src={comment.imageUrl}
                      alt="Comment attachment"
                      className="h-full w-full object-contain transition group-hover:opacity-90"
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white opacity-80">
                    Open full size
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}

        {status === "loaded" && comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#C7D9E6] bg-[#F8FBFD] px-3 py-4 text-sm text-slate-600">
            No comments for this question yet.
          </div>
        ) : null}
      </div>

      <div
        className="mt-6 rounded-2xl border border-[#E6F0F7] bg-[#F9FCFF] p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={(event) => handlePaste(event)}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#2F6F8F]">Display name</label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="gradient-input w-full px-3 py-2 text-sm text-neutral-900 focus:border-[#56A2CD] focus:outline-none"
              placeholder="Admin Team"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#2F6F8F]">Comment</label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              onPaste={(event) => handlePaste(event)}
              className="gradient-textarea w-full resize-y px-3 py-2 text-sm leading-relaxed text-neutral-900 focus:border-[#56A2CD] focus:outline-none"
              rows={4}
              placeholder="Share a clarification, reference, or announcement for students."
            />
          </div>
        </div>

        {draftImageUrl ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#BFD7E6] bg-white/70 p-3 text-sm text-[#2F6F8F]">
            <div className="flex-1">Image attached. Preview or remove it below.</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewImageUrl(draftImageUrl)}
                className="rounded-xl border border-[#2F6F8F] px-3 py-1 text-sm font-medium text-[#2F6F8F] transition hover:bg-[#F3F9FC]"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setDraftImageUrl(null)}
                className="rounded-xl border border-transparent bg-[#e11d48] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#be123c]"
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}

        {draftError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {draftError}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadChange}
          />
          <button
            type="button"
            onClick={triggerUpload}
            disabled={isUploading || isSubmitting}
            className="rounded-xl border border-[#E6F0F7] bg-white px-3 py-2 text-sm font-medium text-[#2F6F8F] transition hover:bg-[#F3F9FC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Uploading…" : "Attach image"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-[#2F6F8F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#225978] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Posting…" : "Post comment"}
          </button>
          <span className="text-[11px] text-slate-500">Images under {uploadLimitMb} MB (PNG/JPG) recommended.</span>
        </div>
      </div>
      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImageUrl(null)}
          role="presentation"
        >
          <div
            className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-2xl bg-white/90 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              aria-label="Close image preview"
            >
              ×
            </button>
            <div className="max-h-[80vh] overflow-auto">
              <img
                src={previewImageUrl}
                alt="Comment attachment preview"
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
