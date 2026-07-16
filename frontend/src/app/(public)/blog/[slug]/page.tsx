"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";

interface ContentPost {
  id: string;
  type: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  author: { id: string; name: string | null } | null;
}

export default function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["content", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ post: ContentPost }>>(
        `/content/${slug}`,
      );
      return data.data.post;
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The blog post you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/blog">
          <Button>Back to Blog</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <article>
        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">
            {post.type}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {post.author && <span>By {post.author.name || "CineTube"}</span>}
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </header>

        {post.excerpt && (
          <p className="text-lg text-muted-foreground mb-8 border-l-4 border-primary pl-4 italic">
            {post.excerpt}
          </p>
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {post.body.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </main>
  );
}
