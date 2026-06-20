"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse, MediaSummary, Media } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  HelpCircle,
  Flame,
  Grid,
  Sparkles,
  Clock,
  Plus,
  Eye,
  Film,
  TrendingUp,
  SlidersHorizontal,
  Bookmark
} from "lucide-react";

// Premium Curated Carousel Items
const HERO_CAROUSEL = [
  {
    id: "hero-1",
    title: "The Dark Knight",
    slug: "the-dark-knight",
    rating: "9.0",
    releaseYear: 2008,
    duration: "2h 32m",
    genre: "Action, Crime, Drama",
    tagline: "Why So Serious?",
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
    trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY"
  },
  {
    id: "hero-2",
    title: "Interstellar",
    slug: "interstellar",
    rating: "8.7",
    releaseYear: 2014,
    duration: "2h 49m",
    genre: "Sci-Fi, Adventure, Drama",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    synopsis: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjU1rPvgNd566hcj6q.jpg",
    trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E"
  },
  {
    id: "hero-3",
    title: "Breaking Bad",
    slug: "breaking-bad",
    rating: "9.5",
    releaseYear: 2008,
    duration: "5 Seasons",
    genre: "Crime, Drama, Thriller",
    tagline: "All Hail the King.",
    synopsis: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/tsRy63MuTJ5tPE7965IQ45G65E5.jpg",
    trailerUrl: "https://www.youtube.com/embed/HhesaQXLuRY"
  }
];

const EDITORS_PICKS = [
  {
    id: "pick-1",
    title: "Inception",
    slug: "inception",
    rating: "8.8",
    tagline: "Your mind is the scene of the crime.",
    backdropUrl: "https://image.tmdb.org/t/p/w780/2u76uVnzB1j4p4t1USj51Vj40JQ.jpg",
    type: "MOVIE",
  },
  {
    id: "pick-2",
    title: "Stranger Things",
    slug: "stranger-things",
    rating: "8.7",
    tagline: "One Summer Can Change Everything.",
    backdropUrl: "https://image.tmdb.org/t/p/w780/56v2Kj2qUNw3wzEUVIaXZG64rnr.jpg",
    type: "SERIES",
  },
  {
    id: "pick-3",
    title: "Pulp Fiction",
    slug: "pulp-fiction",
    rating: "8.9",
    tagline: "Just because you are a character doesn't mean that you have character.",
    backdropUrl: "https://image.tmdb.org/t/p/w780/sua4H0R686brOX66qJ60HgwfhS6.jpg",
    type: "MOVIE",
  },
];

const FAQ_ITEMS = [
  { q: "What is CineTube?", a: "CineTube is a premium movie and series rating, streaming, and discussion portal built for global cinematic enthusiasts." },
  { q: "Is CineTube free to use?", a: "Yes! CineTube offers a robust free tier to browse the catalog and submit reviews. Premium CinePass subscriptions unlock early releases, ad-free UI, and ultra-high-definition streaming links." },
  { q: "How are reviews moderated?", a: "To ensure a premium community space, reviews are analyzed by our moderator panel to filter out spam, harassment, and unmarked spoilers." },
  { q: "Can I manage a personal watchlist?", a: "Absolutely. Once registered, you can build, reorder, and sync your watchlist instantly across devices." },
  { q: "Can I cancel my CinePass plan?", a: "Yes, you can cancel your monthly or annual subscription easily at any time directly through your account profile page." },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const [activeHero, setActiveHero] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  
  // Interactive Quick View modal state
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  
  // Fetch full media details for quick preview
  const { data: quickMedia, isLoading: isQuickLoading } = useQuery({
    queryKey: ["quick-media", selectedSlug],
    queryFn: async () => {
      if (!selectedSlug) return null;
      const { data } = await apiClient.get<ApiResponse<Media>>(`/media/${selectedSlug}`);
      return data.data;
    },
    enabled: !!selectedSlug,
  });

  // Interactive Trailer Modal state
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  // Auto-cycle hero backdrops every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHero((prev) => (prev + 1) % HERO_CAROUSEL.length);
    }, 8500);
    return () => clearInterval(timer);
  }, []);

  // Quick Watchlist Toggle mutation for the Quick View card
  const watchlistMutation = useMutation({
    mutationFn: async ({ mediaId, onWatchlist }: { mediaId: string; onWatchlist: boolean }) => {
      if (onWatchlist) {
        await apiClient.delete(`/watchlist/${mediaId}`);
      } else {
        await apiClient.post("/watchlist", { mediaId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      // Update local quick view state to show updated state if necessary
    }
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden pb-12 relative">
      {/* Ambient Theater Backlighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[450px] rounded-full bg-red-900/10 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] rounded-full bg-amber-900/5 blur-[120px] pointer-events-none -z-10" />

      {/* HERO HERO SECTION WITH INTERACTIVE CAROUSEL */}
      <section className="relative h-[85vh] min-h-[650px] flex items-center justify-start overflow-hidden border-b border-zinc-900">
        {/* Dynamic backdrop slider */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeHero}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.45, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_CAROUSEL[activeHero].backdropUrl})` }}
          />
        </AnimatePresence>

        {/* Cinematic Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/50 z-10" />

        <div className="container mx-auto px-4 relative z-20 w-full">
          <div className="max-w-2xl space-y-6">
            {/* Tagline / Badge */}
            <motion.div
              key={`badge-${activeHero}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Feature Release</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-amber-400 flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400" />
                {HERO_CAROUSEL[activeHero].rating}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              key={`title-${activeHero}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white drop-shadow-md"
            >
              {HERO_CAROUSEL[activeHero].title}
            </motion.h1>

            {/* Movie Meta */}
            <motion.div
              key={`meta-${activeHero}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-wrap items-center gap-3.5 text-xs text-zinc-400 font-medium"
            >
              <span>{HERO_CAROUSEL[activeHero].releaseYear}</span>
              <span className="text-zinc-700">&bull;</span>
              <span>{HERO_CAROUSEL[activeHero].duration}</span>
              <span className="text-zinc-700">&bull;</span>
              <span className="text-zinc-300">{HERO_CAROUSEL[activeHero].genre}</span>
            </motion.div>

            {/* Synopsis */}
            <motion.p
              key={`synopsis-${activeHero}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-zinc-300 leading-relaxed font-light drop-shadow-sm max-w-xl"
            >
              {HERO_CAROUSEL[activeHero].synopsis}
            </motion.p>

            {/* Actions */}
            <motion.div
              key={`actions-${activeHero}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Button
                onClick={() => setTrailerUrl(HERO_CAROUSEL[activeHero].trailerUrl)}
                className="bg-red-650 hover:bg-red-700 text-white font-semibold px-6 h-12 rounded-xl shadow-lg shadow-red-950/20 gap-2 text-sm transition-all"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Watch Trailer</span>
              </Button>
              <Link href={`/browse/${HERO_CAROUSEL[activeHero].slug}`}>
                <Button
                  variant="outline"
                  className="border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 text-zinc-200 hover:text-white px-5 h-12 rounded-xl transition-all gap-2 text-sm"
                >
                  <Info className="h-4 w-4" />
                  <span>View Catalog Page</span>
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-8 right-8 z-20 flex items-center gap-3">
          {HERO_CAROUSEL.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveHero(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === activeHero ? "w-8 bg-red-500" : "w-2.5 bg-zinc-800 hover:bg-zinc-650"
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* HORIZONTAL CATALOG SLIDESHOW ROWS */}
      <MediaRow
        title="Trending Today"
        queryKey="trending-titles"
        params={{ sortBy: "popular" }}
        icon={Flame}
        onCardClick={(media) => setSelectedSlug(media.slug)}
      />
      
      <MediaRow
        title="Critically Acclaimed"
        queryKey="top-rated-titles"
        params={{ sortBy: "top-rated" }}
        icon={Grid}
        onCardClick={(media) => setSelectedSlug(media.slug)}
      />
      
      <MediaRow
        title="Recent Screenings"
        queryKey="new-titles"
        params={{ sortBy: "latest" }}
        icon={Clock}
        onCardClick={(media) => setSelectedSlug(media.slug)}
      />

      {/* CURATED EDITOR'S PICKS GRID */}
      <section className="py-24 bg-gradient-to-b from-zinc-950 to-zinc-900/20 border-b border-zinc-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="h-3 w-3 fill-red-500/20" />
              <span>Curated Selection</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Editor&apos;s Showcases</h2>
            <p className="text-zinc-500 text-xs">
              Weekly masterworks, legendary sequels, and critically acclaimed releases selected by CineTube curators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {EDITORS_PICKS.map((pick, i) => (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900 border border-zinc-850 shadow-md hover:border-red-500/30 transition-all duration-300"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${pick.backdropUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-10 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase tracking-wider">
                      {pick.type}
                    </Badge>
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {pick.rating}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                    {pick.title}
                  </h3>
                  <p className="text-zinc-400 text-xs italic font-light line-clamp-1">
                    &ldquo;{pick.tagline}&rdquo;
                  </p>
                  <div className="pt-1">
                    <Link href={`/browse/${pick.slug}`}>
                      <Button variant="link" className="p-0 text-red-400 hover:text-red-300 text-xs font-semibold gap-1 h-auto">
                        <span>Details & Review</span>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC ACCESS PASS EXPERIENCE */}
      <section className="py-24 border-b border-zinc-900 bg-zinc-950/20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Choose Your Access Tier</h2>
            <p className="text-zinc-500 text-xs">
              Configure parameters, unlock high-definition streams, remove ads, and access custom early review releases.
            </p>

            {/* Custom Sliding Billing Switch */}
            <div className="inline-flex bg-zinc-900/60 border border-zinc-850 p-1 rounded-full relative items-center justify-center mt-3">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`text-xs font-semibold px-4.5 py-1.5 rounded-full z-10 transition-all ${
                  billingPeriod === "monthly" ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Monthly Plan
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                className={`text-xs font-semibold px-4.5 py-1.5 rounded-full z-10 transition-all flex items-center gap-1.5 ${
                  billingPeriod === "yearly" ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>Annual Pass</span>
                <span className="text-[9px] bg-red-650 text-white px-1.5 py-0.5 rounded-full font-bold">SAVE 17%</span>
              </button>

              {/* Slider background highlight */}
              <motion.div
                className="absolute top-1 bottom-1 bg-red-650 rounded-full"
                layout
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{
                  left: billingPeriod === "monthly" ? 4 : "50%",
                  width: "calc(50% - 6px)",
                }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Free Card */}
            <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-850 transition-all flex flex-col justify-between p-6">
              <div className="text-center space-y-4">
                <h3 className="text-base font-bold text-zinc-400">Free Account</h3>
                <div className="flex items-baseline justify-center text-white">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="ml-1 text-xs text-zinc-500">/ forever</span>
                </div>
                <Separator className="border-zinc-900" />
                <ul className="space-y-3.5 text-xs text-zinc-450 text-left pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Browse standard media catalog</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Post ratings and comments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Personal Watchlist tracking</span>
                  </li>
                  <li className="flex items-center gap-2 opacity-35">
                    <X className="h-4 w-4 text-zinc-650" />
                    <span className="line-through">Ad-free streaming</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/register" className="block w-full">
                  <Button className="w-full bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl h-11 text-xs">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Premium Monthly / Yearly Card */}
            <Card className="bg-zinc-900 border-red-650 rounded-2xl overflow-hidden relative shadow-xl shadow-red-950/10 flex flex-col justify-between p-6 scale-105 border-2">
              <Badge className="absolute top-4 right-4 bg-red-650 text-white border-0 font-bold text-[9px] uppercase tracking-wider">
                CinePass Premium
              </Badge>
              <div className="text-center space-y-4">
                <h3 className="text-base font-bold text-white">CinePass Premium</h3>
                <div className="flex items-baseline justify-center text-white">
                  <span className="text-4xl font-extrabold">
                    {billingPeriod === "monthly" ? "$9.99" : "$7.99"}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500">/ month</span>
                </div>
                <p className="text-[10px] text-zinc-550 italic">
                  {billingPeriod === "yearly" ? "Billed annually as $95.88" : "Billed month-to-month"}
                </p>
                <Separator className="border-zinc-850" />
                <ul className="space-y-3.5 text-xs text-zinc-300 text-left pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-red-500" />
                    <span>Watch unlimited premium releases</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-red-500" />
                    <span>Entirely Ad-Free viewing space</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-red-500" />
                    <span>HD & Ultra-HD direct stream links</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-red-500" />
                    <span>Access early spoiler threads</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6">
                <Link href="/register" className="block w-full">
                  <Button className="w-full bg-red-650 hover:bg-red-750 text-white rounded-xl h-11 text-xs shadow-lg shadow-red-950/20 font-semibold">
                    Subscribe to CinePass
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Premium Gold Annual Pass Card */}
            <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-850 transition-all flex flex-col justify-between p-6">
              <div className="text-center space-y-4">
                <h3 className="text-base font-bold text-zinc-400">Gold VIP Pass</h3>
                <div className="flex items-baseline justify-center text-white">
                  <span className="text-4xl font-extrabold">
                    {billingPeriod === "monthly" ? "$14.99" : "$11.99"}
                  </span>
                  <span className="ml-1 text-xs text-zinc-500">/ month</span>
                </div>
                <Separator className="border-zinc-900" />
                <ul className="space-y-3.5 text-xs text-zinc-400 text-left pt-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-500" />
                    <span>All CinePass features included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-500" />
                    <span>VIP server streams (Zero buffering)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-500" />
                    <span>Private film screening invitations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-500" />
                    <span>Exclusive badges for public profile</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/register" className="block w-full">
                  <Button className="w-full bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl h-11 text-xs">
                    Access Gold VIP
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ACCORDION FAQ SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Support Center</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Common Questions</h2>
          <p className="text-zinc-500 text-xs">
            Everything you need to know about streaming credentials, tiers, watchlists, and safety guidelines.
          </p>
        </div>

        <Accordion className="w-full space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-zinc-900 bg-zinc-900/30 rounded-xl px-4 py-1 focus-within:ring-2 focus-within:ring-red-500/10 transition-all"
            >
              <AccordionTrigger className="text-left font-bold text-zinc-200 hover:text-white hover:no-underline py-4 text-sm">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-zinc-400 leading-relaxed pb-4 text-xs font-light">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* DIRECT CTA BANNER WITH HOVER EFFECT */}
      <section className="py-20 container mx-auto px-4 max-w-5xl">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/60 via-red-900/30 to-zinc-900 border border-red-900/30 p-8 md:p-16 text-center shadow-xl">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-red-650 opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-red-650 opacity-10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Ready to Dive In?
            </h2>
            <p className="text-zinc-300 text-sm md:text-base font-light">
              Create an account today to build your watchlist, rate films, and connect with other cinema buffs.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link href="/browse">
                <Button size="lg" className="bg-white hover:bg-zinc-150 text-zinc-950 font-bold px-8 h-12 rounded-xl shadow-lg transition-all text-xs">
                  Browse Media Releases
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="border-zinc-800 hover:border-zinc-350 bg-zinc-950 hover:bg-zinc-900 text-white font-semibold px-8 h-12 rounded-xl transition-all text-xs">
                  Compare Passes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- INTERACTIVE PORTALS & MODALS -------------------- */}

      {/* 1. Quick View Popover Modal */}
      <AnimatePresence>
        {selectedSlug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSlug(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row min-h-[380px]"
            >
              {isQuickLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                  <span className="text-zinc-500 text-xs tracking-wider">Fetching details...</span>
                </div>
              ) : !quickMedia ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500 text-xs">
                  Error loading movie details.
                </div>
              ) : (
                <>
                  {/* Media Poster Left */}
                  <div className="w-full md:w-2/5 aspect-[2/3] md:aspect-auto bg-zinc-950 relative">
                    {quickMedia.posterUrl ? (
                      <img
                        src={quickMedia.posterUrl}
                        alt={quickMedia.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-650 text-xs">
                        🎬 No Poster
                      </div>
                    )}
                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedSlug(null)}
                      className="absolute top-3.5 left-3.5 md:hidden bg-zinc-950/80 text-white p-1.5 rounded-full border border-zinc-800 hover:bg-zinc-900 transition-colors"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Media details Right */}
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase tracking-wider">
                          {quickMedia.type}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>{quickMedia.averageRating || "0.0"}</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white leading-tight">
                        {quickMedia.title}
                      </h3>

                      <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-medium">
                        <span>{quickMedia.releaseYear}</span>
                        <span>&bull;</span>
                        <span className="text-zinc-400">
                          {quickMedia.genres.map((g) => g.genre.name).join(", ")}
                        </span>
                      </div>

                      <p className="text-zinc-350 text-xs leading-relaxed line-clamp-4 font-light">
                        {quickMedia.synopsis}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex gap-2">
                        <Link href={`/browse/${quickMedia.slug}`} className="flex-1">
                          <Button className="w-full bg-red-650 hover:bg-red-750 text-white rounded-xl h-11 text-xs gap-1.5 font-semibold">
                            <Eye className="h-4 w-4" />
                            <span>Go to Detail Page</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() =>
                            watchlistMutation.mutate({
                              mediaId: quickMedia.id,
                              onWatchlist: false
                            })
                          }
                          className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl h-11 px-3.5"
                        >
                          <Bookmark className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                      <button
                        onClick={() => setSelectedSlug(null)}
                        className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-400 font-semibold uppercase tracking-wider pt-1"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>

                  {/* Close Button Top Right Desktop */}
                  <button
                    onClick={() => setSelectedSlug(null)}
                    className="absolute top-4 right-4 hidden md:flex bg-zinc-950/80 text-white p-1.5 rounded-full border border-zinc-800 hover:bg-zinc-900 transition-colors"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Embedded Video Trailer Playback Modal */}
      <AnimatePresence>
        {trailerUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrailerUrl(null)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl aspect-video bg-black border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              <iframe
                src={`${trailerUrl}?autoplay=1&mute=0`}
                title="Movie Trailer"
                className="w-full h-full"
                allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setTrailerUrl(null)}
                className="absolute top-4 right-4 bg-zinc-950/85 hover:bg-zinc-900 text-white p-2 rounded-full border border-zinc-800 transition-all"
                title="Close Trailer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// REUSABLE CAROUSEL MEDIA ROW COMPONENT
interface MediaRowProps {
  title: string;
  queryKey: string;
  params: Record<string, string | number>;
  icon: any;
  onCardClick: (media: MediaSummary) => void;
}

function MediaRow({ title, queryKey, params, icon: Icon, onCardClick }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<MediaSummary[]>>("/media", {
        params: { limit: 12, ...params },
      });
      return data.data;
    },
  });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <section className="py-12 border-b border-zinc-900/60 relative group">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2.5 tracking-tight text-white">
            <Icon className="h-5 w-5 text-red-500 fill-red-500/10" />
            <span>{title}</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-5 overflow-x-hidden py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-[160px] sm:w-[200px] shrink-0 aspect-[2/3] rounded-2xl bg-zinc-900/40 animate-pulse border border-zinc-850/50"
              />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="h-36 flex items-center justify-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10 text-zinc-500 text-xs italic font-light">
            No media titles found.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-none py-3 px-1 -mx-1"
            style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
          >
            {data.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-[160px] sm:w-[200px] shrink-0 scroll-snap-align-start group/card cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-850 hover:border-red-500/40 transition-all duration-300 shadow-md">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50 text-zinc-650 text-xs">
                      🎬 <span className="mt-2 text-[10px]">No Artwork</span>
                    </div>
                  )}

                  {/* Dark transparent gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10" />

                  {/* Floating Star Rating badge */}
                  <div className="absolute top-2.5 right-2.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-850 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-400 flex items-center gap-1 shadow-sm z-10">
                    <Star className="h-3 w-3 fill-amber-400" />
                    <span>{item.averageRating || "0.0"}</span>
                  </div>

                  {/* Hover action popup */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-y-3 group-hover/card:translate-y-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCardClick(item);
                      }}
                      className="bg-red-650 hover:bg-red-700 text-white rounded-full p-3 shadow-lg transform active:scale-95 transition-all mb-2"
                      title="Quick Preview"
                    >
                      <Play className="h-4.5 w-4.5 fill-white ml-0.5" />
                    </button>
                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      Quick View
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 space-y-1">
                  <h3 className="text-zinc-250 font-bold text-xs sm:text-sm truncate group-hover/card:text-white transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-550 font-medium">
                    <span>{item.releaseYear}</span>
                    <span>&bull;</span>
                    <span className="truncate max-w-[130px]">
                      {item.genres.map((g) => g.genre.name).join(", ")}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
