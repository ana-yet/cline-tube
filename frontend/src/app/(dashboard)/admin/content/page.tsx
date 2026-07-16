"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Admin Content Management Page
 *
 * CRUD for blog/help/legal content posts.
 */

interface ContentPost {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null } | null;
}

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    type: "BLOG",
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    status: "DRAFT",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", page],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<ContentPost[]> & {
          meta: { page: number; totalPages: number; total: number };
        }
      >("/content/admin/all", { params: { page, limit: 20 } });
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/content", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      setShowCreate(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(apiError.response?.data?.error?.message || "Failed to create post");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/content/${id}`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      setEditingId(null);
      resetForm();
    },
    onError: (err: unknown) => {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(apiError.response?.data?.error?.message || "Failed to update post");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
    },
  });

  const resetForm = () => {
    setForm({ type: "BLOG", title: "", slug: "", excerpt: "", body: "", status: "DRAFT" });
    setError(null);
  };

  const startEdit = (post: ContentPost) => {
    setForm({
      type: post.type,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      body: post.body,
      status: post.status,
    });
    setEditingId(post.id);
    setShowCreate(false);
  };

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowCreate(true);
            setEditingId(null);
          }}
        >
          New Post
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Post" : "New Post"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: string | null) => {
                    if (v) setForm((f) => ({ ...f, type: v }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOG">Blog</SelectItem>
                    <SelectItem value="HELP">Help</SelectItem>
                    <SelectItem value="LEGAL">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: string | null) => {
                    if (v) setForm((f) => ({ ...f, status: v }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="my-post-slug"
              />
            </div>

            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Input
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                rows={10}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() =>
                  editingId
                    ? updateMutation.mutate(editingId)
                    : createMutation.mutate()
                }
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Update" : "Create"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No content posts yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((post) => (
            <Card key={post.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{post.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {post.type}
                    </Badge>
                    <Badge
                      variant={
                        post.status === "PUBLISHED"
                          ? "default"
                          : post.status === "DRAFT"
                            ? "outline"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    /{post.slug} • {post.author?.name || "Unknown"} •{" "}
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(post)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${post.title}"?`)) {
                        deleteMutation.mutate(post.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
