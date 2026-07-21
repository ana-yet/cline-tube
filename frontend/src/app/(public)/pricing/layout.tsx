import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "CinePass Pricing",
  description:
    "Compare CineTube free and premium access plans for movies, series, reviews, watchlists, and streaming.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
