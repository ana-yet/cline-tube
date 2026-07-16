"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

/**
 * Admin Contacts Page
 *
 * View and manage contact form submissions.
 * Update status: NEW → ASSIGNED → RESOLVED / DISMISSED
 */

interface ContactSubmission {
  id: string;
  category: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  assignedToId: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string | null } | null;
}

export default function AdminContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "contacts", { statusFilter, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await apiClient.get<
        ApiResponse<ContactSubmission[]> & {
          meta: { page: number; totalPages: number; total: number };
        }
      >("/contact", { params });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => {
      await apiClient.patch(`/contact/${id}`, {
        status,
        resolutionNote: note || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "contacts"] });
      setSelectedId(null);
      setResolutionNote("");
    },
  });

  const items = data?.data ?? [];
  const meta = data?.meta;

  const statusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "ASSIGNED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "RESOLVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DISMISSED":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contact Submissions</h1>
        <div className="flex gap-2">
          {["", "NEW", "ASSIGNED", "RESOLVED", "DISMISSED"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No contact submissions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{item.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {item.name} ({item.email}) • {item.category} •{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={statusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">{item.message}</p>

                {item.resolutionNote && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <strong>Resolution:</strong> {item.resolutionNote}
                  </div>
                )}

                {selectedId === item.id && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Resolution note (optional)..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      {item.status !== "RESOLVED" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              status: "RESOLVED",
                              note: resolutionNote,
                            })
                          }
                          disabled={updateMutation.isPending}
                        >
                          Resolve
                        </Button>
                      )}
                      {item.status !== "ASSIGNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              status: "ASSIGNED",
                            })
                          }
                        >
                          Assign
                        </Button>
                      )}
                      {item.status !== "DISMISSED" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              status: "DISMISSED",
                              note: resolutionNote,
                            })
                          }
                        >
                          Dismiss
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selectedId !== item.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedId(item.id)}
                  >
                    Manage
                  </Button>
                )}
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
