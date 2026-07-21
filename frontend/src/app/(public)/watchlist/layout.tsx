import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Watchlist",
  description: "Review and manage the movies and series saved to your CineTube watchlist.",
  path: "/watchlist",
  noIndex: true,
});

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
