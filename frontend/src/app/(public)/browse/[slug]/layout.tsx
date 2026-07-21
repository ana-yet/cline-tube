import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Media Details",
  description:
    "View CineTube media details, synopsis, ratings, reviews, watchlist actions, and access options.",
  path: "/browse",
});

export default function MediaDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
