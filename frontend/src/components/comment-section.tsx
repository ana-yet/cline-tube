"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, Comment } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

interface CommentSectionProps {
  reviewId: string;
}

export function CommentSection({ reviewId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", reviewId],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{ comments: Comment[] }>
      >(`/reviews/${reviewId}/comments`);
      return data.data.comments;
    },
    enabled: expanded,
  });

  const createMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiClient.post(`/reviews/${reviewId}/comments`, { content: text });
    },
    onSuccess: () => {
      setContent("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message || "Failed to post comment",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/reviews/${reviewId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  return (
    <div className="pt-3 border-t space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded((prev) => !prev)}
        className="text-muted-foreground"
      >
        {expanded ? "Hide comments" : "Show comments"}
      </Button>

      {expanded && (
        <div className="space-y-4 pl-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments yet. Start the discussion.
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <CommentItem
                    comment={comment}
                    currentUserId={user?.id}
                    currentUserRole={user?.role}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                  {comment.replies?.map((reply) => (
                    <div key={reply.id} className="ml-6">
                      <CommentItem
                        comment={reply}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {isAuthenticated ? (
            <div className="space-y-2">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="bg-zinc-950 border-zinc-800"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                size="sm"
                disabled={!content.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(content.trim())}
              >
                {createMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-red-400 hover:underline">
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  currentUserRole?: string;
  onDelete: (id: string) => void;
}) {
  const canDelete =
    currentUserId === comment.userId || currentUserRole === "ADMIN";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium">
          {comment.user.name || "Anonymous"}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{comment.content}</p>
      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-destructive"
          onClick={() => {
            if (confirm("Delete this comment?")) {
              onDelete(comment.id);
            }
          }}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
