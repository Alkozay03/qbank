"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  DragEvent,
  ClipboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const COMMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type QuestionDiscussionComment = {
  id: string;
  authorName: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  createdByRole?: "MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null;
  createdByEmail?: string | null;
  createdByGradYear?: number | null;
  origin?: "runner" | "editor" | null;
  parentId?: string | null;
  upvoteCount?: number;
  replyCount?: number;
  hasVoted?: boolean;
  replies?: QuestionDiscussionComment[];
};

interface Props {
  questionId: string;
}

export default function QuestionDiscussion({ questionId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [comments, setComments] = useState<QuestionDiscussionComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [draftName, setDraftName] = useState<string>("");
  const [draftBody, setDraftBody] = useState<string>("");
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const previewCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<"MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR" | null>(null);

  // New state for sorting and reply functionality
  const [sortBy, setSortBy] = useState<"recent" | "upvotes" | "popular" | "oldest">("recent");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraftName, setReplyDraftName] = useState<string>("");
  const [replyDraftBody, setReplyDraftBody] = useState<string>("");
  const [replyDraftImageUrl, setReplyDraftImageUrl] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplyUploading, setIsReplyUploading] = useState(false);
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

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
      const resolved = candidate?.trim() || fallbackEmail || "Study Partner";
      setDraftName((prev) => (prev.trim().length ? prev : resolved));
    },
    []
  );

  useEffect(() => {
    if (!previewImageUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreviewImageUrl(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timeout = window.setTimeout(() => {
      previewCloseButtonRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timeout);
    };
  }, [previewImageUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/role", { cache: "no-store" });
        const payload = (await res.json().catch(() => ({}))) as {
          email?: string;
          role?: "MEMBER" | "ADMIN" | "MASTER_ADMIN" | "WEBSITE_CREATOR";
          name?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(payload?.error ?? "Unable to load your profile");
        }
        if (cancelled) return;
        setUserEmail(payload?.email ?? "");
        setUserRole(payload?.role ?? null);
        const candidateName =
          payload?.name ||
          [payload?.firstName, payload?.lastName]
            .filter((part) => typeof part === "string" && (part ?? "").trim().length > 0)
            .join(" ")
            .trim();
        setDefaultName(candidateName, payload?.email);
      } catch (err) {
        if (cancelled) return;
        setWarning(
          (err instanceof Error && err.message) ||
            "We could not load your profile details. Posting will use a fallback name."
        );
        setDefaultName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setDefaultName]);

  const loadComments = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/questions/${questionId}/comments?sort=${sortBy}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as {
        comments?: QuestionDiscussionComment[];
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
            replies: Array.isArray(comment.replies) ? comment.replies : [],
            upvoteCount: comment.upvoteCount ?? 0,
            replyCount: comment.replyCount ?? 0,
            hasVoted: comment.hasVoted ?? false,
          }))
        : [];
      setComments(items);
      setStatus("loaded");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error && err.message ? err.message : "Unable to load comments");
    }
  }, [questionId, sortBy]);

  useEffect(() => {
    loadComments().catch(() => {
      /* handled in loadComments */
    });
  }, [loadComments]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadImage = useCallback(async (file: File) => {
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

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload?.error ?? "Upload failed");
      }

      const payload = (await res.json().catch(() => ({}))) as { url?: string };
      if (!payload?.url) throw new Error("Upload did not return an image URL");

      setDraftImageUrl(payload.url);
    } catch (err) {
      setDraftError(err instanceof Error && err.message ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadImage(file);
      }
      event.target.value = "";
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      const file = files.find((f) => f.type.startsWith("image/"));
      if (file) {
        await uploadImage(file);
      }
    },
    [uploadImage]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handlePaste = useCallback(
    async (event: ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const fileItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
      if (fileItem) {
        const file = fileItem.getAsFile();
        if (file) {
          event.preventDefault();
          await uploadImage(file);
        }
      }
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
          authorName: draftName.trim() || "Study Partner",
          origin: "runner",
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        comment?: QuestionDiscussionComment;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to post comment");
      }
      if (!payload?.comment) throw new Error("Unexpected response from server");

      const fallbackAuthorName = draftName.trim() || "Study Partner";
      const saved: QuestionDiscussionComment = {
        ...payload.comment,
        authorName: payload.comment.authorName ?? fallbackAuthorName,
        origin: payload.comment.origin ?? "runner",
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
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
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
    (comment: QuestionDiscussionComment) => {
      if (!comment) return false;
      const viewerEmail = (userEmail ?? "").trim().toLowerCase();
      if (!viewerEmail) return false;
      
      // Allow deletion if user owns the comment
      const ownerEmail = (comment.createdByEmail ?? "").trim().toLowerCase();
      if (Boolean(ownerEmail) && ownerEmail === viewerEmail) return true;
      
      // Allow deletion if user is admin, master admin, or website creator
      if (userRole === "ADMIN" || userRole === "MASTER_ADMIN" || userRole === "WEBSITE_CREATOR") return true;
      
      return false;
    },
    [userEmail, userRole]
  );

  // Toggle vote on a comment
  const handleVote = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`/api/questions/${questionId}/comments/${commentId}/vote`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        voted?: boolean;
        upvoteCount?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to toggle vote");
      }

      // Update comment vote status
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                hasVoted: payload.voted ?? false,
                upvoteCount: payload.upvoteCount ?? comment.upvoteCount ?? 0,
              }
            : comment
        )
      );
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Unable to toggle vote");
    }
  }, [questionId]);

  // Toggle reply expansion
  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  // Start replying to a comment
  const startReply = useCallback((commentId: string, authorName: string) => {
    setReplyingTo(commentId);
    setReplyDraftName(draftName || `@${authorName}`);
    setReplyDraftBody("");
    setReplyDraftImageUrl(null);
    setReplyError(null);
  }, [draftName]);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyDraftName("");
    setReplyDraftBody("");
    setReplyDraftImageUrl(null);
    setReplyError(null);
  }, []);

  // Upload reply image
  const uploadReplyImage = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setReplyError("Only image files are supported.");
      return;
    }
    if (file.size > COMMENT_IMAGE_MAX_BYTES) {
      setReplyError(`Image too large. Max size: ${Math.round(COMMENT_IMAGE_MAX_BYTES / (1024 * 1024))}MB`);
      return;
    }

    setIsReplyUploading(true);
    setReplyError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "comments");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Upload failed");
      }
      setReplyDraftImageUrl(payload.url);
    } catch (err) {
      setReplyError(err instanceof Error && err.message ? err.message : "Upload failed");
    } finally {
      setIsReplyUploading(false);
    }
  }, []);

  // Submit reply
  const submitReply = useCallback(async () => {
    if (!replyingTo) return;
    if (!replyDraftBody.trim() && !replyDraftImageUrl) {
      setReplyError("Please add a comment or image.");
      return;
    }

    setIsReplySubmitting(true);
    setReplyError(null);

    try {
      const res = await fetch(`/api/questions/${questionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: replyDraftBody.trim(),
          imageUrl: replyDraftImageUrl || "",
          authorName: replyDraftName.trim() || "Study Partner",
          parentId: replyingTo,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        comment?: QuestionDiscussionComment;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to post reply");
      }
      if (!payload?.comment) throw new Error("Unexpected response from server");

      const saved: QuestionDiscussionComment = {
        ...payload.comment,
        authorName: payload.comment.authorName ?? "Study Partner",
        origin: payload.comment.origin ?? "runner",
      };

      // Add reply to parent comment
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === replyingTo
            ? {
                ...comment,
                replies: [...(comment.replies || []), saved],
                replyCount: (comment.replyCount || 0) + 1,
              }
            : comment
        )
      );

      // Expand replies to show the new one
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.add(replyingTo);
        return next;
      });

      cancelReply();
    } catch (err) {
      setReplyError(err instanceof Error && err.message ? err.message : "Unable to post reply");
    } finally {
      setIsReplySubmitting(false);
    }
  }, [replyingTo, replyDraftBody, replyDraftImageUrl, replyDraftName, questionId, cancelReply]);

  const commentCount = comments.length;
  const uploadLimitMb = Math.round(COMMENT_IMAGE_MAX_BYTES / (1024 * 1024));

  // Helper to check if dark mode is active
  const isDark = typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme-type') === 'dark';

  return (
    <>
      <section 
        className="rounded-2xl border p-4 shadow-sm"
        style={{
          borderColor: isDark ? '#4b5563' : 'var(--color-border)',
          background: isDark 
            ? '#000000' 
            : 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05) 0%, rgba(var(--color-primary-rgb), 0.02) 50%, rgba(var(--color-primary-rgb), 0.05) 100%)'
        }}
      >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 
            className="text-lg font-semibold"
            style={{
              color: isDark ? '#ffffff' : 'var(--color-primary)'
            }}
          >
            Question Discussion
          </h3>
          <span 
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-white"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
              borderColor: 'var(--color-primary)'
            }}
          >
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border px-3 py-1.5 text-xs font-medium text-primary"
            style={{ 
              transition: 'all 0.2s ease-out', 
              borderColor: 'var(--color-primary)',
              backgroundColor: isDark ? '#1f2937' : 'white',
              color: isDark ? '#ffffff' : 'var(--color-primary)'
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="upvotes">Most Upvotes</option>
            <option value="popular">Most Popular</option>
            <option value="oldest">Oldest</option>
          </select>
          <button
            type="button"
            onClick={() => {
              loadComments().catch(() => {
                /* handled internally */
              });
            }}
            disabled={status === "loading"}
            className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-60"
            style={{ 
              transition: 'all 0.2s ease-out', 
              borderColor: 'var(--color-primary)',
              backgroundColor: isDark ? '#1f2937' : 'white',
              color: isDark ? '#ffffff' : 'var(--color-primary)'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : 'white';
              }
            }}
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
          <div className="rounded-xl border px-3 py-2 text-sm text-muted" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-secondary)' }}>
            Loading comments…
          </div>
        ) : null}

        {comments.map((comment) => {
          const created = new Date(comment.createdAt);
          const absolute = Number.isNaN(created.getTime()) ? "" : absoluteFormatter.format(created);
          const relative = formatRelativeTime(comment.createdAt);
          const isStaff = comment.createdByRole === "ADMIN" || comment.createdByRole === "MASTER_ADMIN" || comment.createdByRole === "WEBSITE_CREATOR";
          const gradLabel =
            typeof comment.createdByGradYear === "number" && Number.isFinite(comment.createdByGradYear)
              ? `Class of ${comment.createdByGradYear}`
              : null;
          
          let pillLabel: string | null = null;
          let cohortLabel: string;
          let displayName: string;
          let timeDisplay: string | null = null;

          if (isStaff && comment.origin === "editor") {
            // Admin/master admin adding comment through question editor (previous batch)
            pillLabel = "Previous Batch";
            cohortLabel = "Class of < 2027";
            displayName = comment.authorName || "Previous Batch Student";
            timeDisplay = "Long time ago 🤷";
          } else if (isStaff && comment.origin === "runner") {
            // Admin/master admin posting directly in quiz runner - show as Member to stay anonymous
            pillLabel = "Member";
            cohortLabel = gradLabel ?? "Class of 2027";
            displayName = comment.authorName || "Study Partner";
            timeDisplay = relative;
          } else {
            // Regular student comment - show their actual role
            pillLabel = comment.createdByRole || "Member";
            cohortLabel = gradLabel ?? "Class of 2027";
            displayName = comment.authorName || "Study Partner";
            timeDisplay = relative;
          }
          return (
            <div key={comment.id} className="rounded-2xl border p-3" style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 107, 114, 128), 0.02)', borderColor: 'var(--color-border)' }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <span>{displayName}</span>
                    {pillLabel ? (
                      <span 
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))' }}
                      >
                        {pillLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-primary)', opacity: 0.6 }}>
                    <span>{cohortLabel}</span>
                    {comment.origin === "editor" ? (
                      <span>· {timeDisplay}</span>
                    ) : (
                      <>
                        {absolute && <span>{absolute}</span>}
                        {timeDisplay && <span>· {timeDisplay}</span>}
                      </>
                    )}
                  </div>
                </div>
                {canDelete(comment) ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs font-medium text-[#e11d48] underline underline-offset-2"
                    style={{ transition: 'all 0.2s ease-out' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textShadow = '0 0 8px rgba(239, 29, 72, 0.6)';
                      e.currentTarget.style.color = '#be123c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textShadow = 'none';
                      e.currentTarget.style.color = '#e11d48';
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              {comment.body ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--color-primary)', opacity: 0.8 }}>
                  {comment.body}
                </p>
              ) : null}

              {comment.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(comment.imageUrl!)}
                  className="group relative mt-3 block overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-secondary)' }}
                >
                  <div className="relative h-44 w-full">
                    <img
                      src={comment.imageUrl}
                      alt="Discussion attachment"
                      className="h-full w-full object-contain transition group-hover:opacity-90"
                    />
                  </div>
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white opacity-80">
                    Open full size
                  </span>
                </button>
              ) : null}

              {/* Vote and Reply Actions */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleVote(comment.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: comment.hasVoted 
                      ? isDark ? 'rgba(var(--color-primary-rgb), 0.2)' : 'var(--color-primary-light)'
                      : isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(var(--color-primary-rgb), 0.05)',
                    color: comment.hasVoted ? 'var(--color-primary)' : isDark ? '#9ca3af' : 'var(--color-primary)',
                    border: `1px solid ${comment.hasVoted ? 'var(--color-primary)' : isDark ? '#374151' : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>{comment.hasVoted ? '👍' : '👍🏻'}</span>
                  <span>{comment.upvoteCount || 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => startReply(comment.id, displayName)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(var(--color-primary-rgb), 0.05)',
                    color: isDark ? '#9ca3af' : 'var(--color-primary)',
                    border: `1px solid ${isDark ? '#374151' : 'var(--color-border)'}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>💬</span>
                  <span>Reply</span>
                </button>

                {(comment.replyCount ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleReplies(comment.id)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(var(--color-primary-rgb), 0.05)',
                      color: isDark ? '#9ca3af' : 'var(--color-primary)',
                      border: `1px solid ${isDark ? '#374151' : 'var(--color-border)'}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span>{expandedReplies.has(comment.id) ? '▼' : '▶'}</span>
                    <span>{comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}</span>
                  </button>
                )}
              </div>

              {/* Reply Input (inline when replying to this comment) */}
              {replyingTo === comment.id && (
                <div className="mt-3 border-l-2 pl-3" style={{ borderColor: 'var(--color-primary)' }}>
                  <div className="rounded-xl border p-3" style={{ backgroundColor: isDark ? '#1f2937' : 'rgba(var(--color-primary-rgb), 0.03)', borderColor: 'var(--color-border)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
                      Replying to {displayName}
                    </div>
                    <input
                      type="text"
                      value={replyDraftName}
                      onChange={(e) => setReplyDraftName(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs mb-2"
                      style={{ 
                        borderColor: 'var(--color-border)',
                        backgroundColor: isDark ? '#111827' : 'white',
                        color: isDark ? '#ffffff' : 'var(--color-primary)'
                      }}
                      placeholder="Your display name"
                    />
                    <textarea
                      value={replyDraftBody}
                      onChange={(e) => setReplyDraftBody(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                      style={{ 
                        borderColor: 'var(--color-border)',
                        backgroundColor: isDark ? '#111827' : 'white',
                        color: isDark ? '#ffffff' : 'var(--color-primary)'
                      }}
                      placeholder="Write your reply..."
                    />
                    {replyDraftImageUrl && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span style={{ color: 'var(--color-primary)' }}>Image attached</span>
                        <button
                          type="button"
                          onClick={() => setReplyDraftImageUrl(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {replyError && (
                      <p className="mt-2 text-xs text-red-600">{replyError}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        ref={replyFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadReplyImage(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => replyFileInputRef.current?.click()}
                        disabled={isReplyUploading || isReplySubmitting}
                        className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                      >
                        {isReplyUploading ? 'Uploading...' : '📎 Image'}
                      </button>
                      <button
                        type="button"
                        onClick={submitReply}
                        disabled={isReplySubmitting || (!replyDraftBody.trim() && !replyDraftImageUrl)}
                        className="rounded-lg px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))' }}
                      >
                        {isReplySubmitting ? 'Posting...' : 'Post Reply'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelReply}
                        className="rounded-lg border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--color-border)', color: isDark ? '#9ca3af' : 'var(--color-primary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies Section (collapsed by default) */}
              {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 pl-3" style={{ borderColor: 'var(--color-primary)', opacity: 0.8 }}>
                  {comment.replies.map((reply) => {
                    const replyCreated = new Date(reply.createdAt);
                    const replyAbsolute = Number.isNaN(replyCreated.getTime()) ? "" : absoluteFormatter.format(replyCreated);
                    const replyRelative = formatRelativeTime(reply.createdAt);
                    const replyIsStaff = reply.createdByRole === "ADMIN" || reply.createdByRole === "MASTER_ADMIN" || reply.createdByRole === "WEBSITE_CREATOR";
                    const replyGradLabel =
                      typeof reply.createdByGradYear === "number" && Number.isFinite(reply.createdByGradYear)
                        ? `Class of ${reply.createdByGradYear}`
                        : null;
                    
                    let replyPillLabel: string | null = null;
                    let replyCohortLabel: string;
                    let replyDisplayName: string;
                    let replyTimeDisplay: string | null = null;

                    if (replyIsStaff && reply.origin === "editor") {
                      replyPillLabel = "Previous Batch";
                      replyCohortLabel = "Class of < 2027";
                      replyDisplayName = reply.authorName || "Previous Batch Student";
                      replyTimeDisplay = "Long time ago 🤷";
                    } else if (replyIsStaff && reply.origin === "runner") {
                      replyPillLabel = "Member";
                      replyCohortLabel = replyGradLabel ?? "Class of 2027";
                      replyDisplayName = reply.authorName || "Study Partner";
                      replyTimeDisplay = replyRelative;
                    } else {
                      replyPillLabel = reply.createdByRole || "Member";
                      replyCohortLabel = replyGradLabel ?? "Class of 2027";
                      replyDisplayName = reply.authorName || "Study Partner";
                      replyTimeDisplay = replyRelative;
                    }

                    return (
                      <div key={reply.id} className="rounded-xl border p-2" style={{ backgroundColor: isDark ? '#1f2937' : 'rgba(var(--color-primary-rgb), 0.02)', borderColor: 'var(--color-border)' }}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: isDark ? '#d1d5db' : 'var(--color-primary)' }}>
                              <span>{replyDisplayName}</span>
                              {replyPillLabel && (
                                <span 
                                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))' }}
                                >
                                  {replyPillLabel}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-primary)', opacity: 0.5 }}>
                              <span>{replyCohortLabel}</span>
                              {reply.origin === "editor" ? (
                                <span>· {replyTimeDisplay}</span>
                              ) : (
                                <>
                                  {replyAbsolute && <span>{replyAbsolute}</span>}
                                  {replyTimeDisplay && <span>· {replyTimeDisplay}</span>}
                                </>
                              )}
                            </div>
                          </div>
                          {canDelete(reply) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(reply.id)}
                              className="text-[10px] font-medium text-[#e11d48] underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {reply.body && (
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: isDark ? '#d1d5db' : 'var(--color-primary)', opacity: 0.8 }}>
                            {reply.body}
                          </p>
                        )}
                        {reply.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(reply.imageUrl!)}
                            className="group relative mt-2 block overflow-hidden rounded-lg border"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-secondary)' }}
                          >
                            <div className="relative h-32 w-full">
                              <img
                                src={reply.imageUrl}
                                alt="Reply attachment"
                                className="h-full w-full object-contain transition group-hover:opacity-90"
                              />
                            </div>
                            <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white opacity-80">
                              Open
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {status === "loaded" && comments.length === 0 ? (
          <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background-secondary)' }}>
            No comments yet. Be the first to share a tip or mnemonic.
          </div>
        ) : null}
      </div>

      <div
        className="mt-6 rounded-2xl border p-4"
        style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 107, 114, 128), 0.015)', borderColor: 'var(--color-border)' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={(event) => handlePaste(event)}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-primary">Display name</label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="rounded-xl border bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-light)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="How should others see you?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-primary">Comment</label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              onPaste={(event) => handlePaste(event)}
              rows={3}
              className="rounded-xl border bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition"
              style={{ borderColor: 'var(--color-border)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-light)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="Share reasoning, references, or tips for this question."
            />
          </div>
        </div>

        {draftImageUrl ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm text-primary" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
            <div className="flex-1">Image attached. Preview or remove it below.</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewImageUrl(draftImageUrl)}
                className="rounded-xl border px-3 py-1 text-sm font-medium text-primary transition"
                style={{ borderColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setDraftImageUrl(null)}
                className="rounded-xl border border-transparent bg-[#e11d48] px-3 py-1 text-sm font-medium text-white"
                style={{ transition: 'all 0.2s ease-out' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.backgroundColor = '#be123c';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 29, 72, 0.4), 0 8px 25px rgba(190, 18, 60, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.backgroundColor = '#e11d48';
                  e.currentTarget.style.boxShadow = 'none';
                }}
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
            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-60"
            style={{ transition: 'all 0.2s ease-out', borderColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            {isUploading ? "Uploading…" : "Attach image"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ 
              transition: 'all 0.2s ease-out',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))'
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.25)';
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {isSubmitting ? "Posting…" : "Post comment"}
          </button>
          <span className="text-[11px]" style={{ color: 'var(--color-primary)', opacity: 0.5 }}>Images under {uploadLimitMb} MB (PNG/JPG) recommended.</span>
        </div>
      </div>
      </section>

      {previewImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewImageUrl(null)}
          role="presentation"
        >
          <div
            className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-2xl bg-white/90 p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Comment attachment preview"
            tabIndex={-1}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              ref={previewCloseButtonRef}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg font-semibold text-white hover:bg-black/70"
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
    </>
  );
}
