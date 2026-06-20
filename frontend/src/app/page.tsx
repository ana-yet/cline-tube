"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function MediaRow({
  title,
  queryKey,
  params,
}: {
  title: string;
  queryKey: string;
  params: Record<string, string | number>;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MediaSummary[]>>(
        "/media",
        { params: { limit: 8, ...params } },
      );
      return data.data;
    },
  });

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
            {data?.map((item) => (
              <Link
                key={item.id}
                href={`/browse/${item.slug}`}
                className="group"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      🎬
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-yellow-400 text-xs">
                      ⭐ {item.averageRating}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is CineTube?",
    a: "CineTube is a movie and series rating and streaming portal where you can discover, rate, and review your favorite content.",
  },
  {
    q: "Is CineTube free to use?",
    a: "Yes! CineTube offers a free tier with access to free content. Premium subscriptions unlock exclusive movies and series.",
  },
  {
    q: "How do reviews work?",
    a: "Any registered user can submit a review. Reviews go through a moderation process to ensure quality. Once approved, they appear on the media page.",
  },
  {
    q: "Can I create a watchlist?",
    a: "Yes! Logged-in users can add any movie or series to their personal watchlist for easy access later.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards through our secure payment processor, Stripe.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="relative h-[70vh] min-h-[500px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg)",
          }}
        />
        <div className="container mx-auto px-4 relative z-20">
          <Badge className="mb-4">Featured</Badge>
          <h1 className="text-4xl md:text-6xl font-bold max-w-2xl leading-tight">
            The Dark Knight
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl">
            When the menace known as the Joker wreaks havoc on Gotham, Batman
            must accept one of the greatest psychological and physical tests of
            his ability to fight injustice.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/browse">
              <Button size="lg">Browse Movies</Button>
            </Link>
            <Link href="/browse/the-dark-knight">
              <Button size="lg" variant="outline">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MediaRow
        title="🔥 Trending This Week"
        queryKey="home-trending"
        params={{ sortBy: "popular" }}
      />
      <MediaRow
        title="⭐ Top Rated"
        queryKey="home-top-rated"
        params={{ sortBy: "top-rated" }}
      />
      <MediaRow
        title="🆕 Newly Added"
        queryKey="home-latest"
        params={{ sortBy: "latest" }}
      />

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Choose Your Plan</h2>
            <p className="mt-2 text-muted-foreground">
              Unlock premium content and features
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold">Free</h3>
                <div className="mt-4 text-4xl font-bold">$0</div>
                <p className="text-muted-foreground">forever</p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground text-left">
                  <li>✅ Browse all free content</li>
                  <li>✅ Submit reviews</li>
                  <li>✅ Create watchlist</li>
                  <li>❌ Premium content</li>
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="relative border-primary">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Popular
              </Badge>
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold">Monthly</h3>
                <div className="mt-4 text-4xl font-bold">$9.99</div>
                <p className="text-muted-foreground">per month</p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground text-left">
                  <li>✅ Everything in Free</li>
                  <li>✅ All premium content</li>
                  <li>✅ Ad-free experience</li>
                  <li>✅ Cancel anytime</li>
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full">Subscribe</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <h3 className="text-xl font-bold">Yearly</h3>
                <div className="mt-4 text-4xl font-bold">$99.99</div>
                <p className="text-muted-foreground">
                  per year{" "}
                  <span className="text-green-500 font-medium">save 17%</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground text-left">
                  <li>✅ Everything in Monthly</li>
                  <li>✅ Priority support</li>
                  <li>✅ Early access</li>
                  <li>✅ Best value</li>
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full" variant="outline">
                    Subscribe
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <Accordion className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Start Watching?
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
            Join thousands of movie enthusiasts. Get unlimited access to premium
            content.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/browse">
              <Button size="lg" variant="secondary">
                Browse Free Content
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
