"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";

interface ContentPost {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
}

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["content", "blog"],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<ContentPost[]> & {
          meta: { page: number; totalPages: number; total: number };
        }
      >("/content", { params: { type: "BLOG", limit: 20 } });
      return data;
    },
  });

  const posts = data?.data ?? [];

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <section className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          CineTube Blog
        </h1>
        <p className="text-muted-foreground">
          News, reviews, and insights from the CineTube team.
        </p>
      </section>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No blog posts yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="secondary">{post.type}</Badge>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                {post.excerpt && (
                  <CardContent>
                    <p className="text-muted-foreground">{post.excerpt}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium">
                      Read more <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
