import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Browse Movies and Series",
  description:
    "Explore CineTube's movie and series catalog by genre, title type, rating, year, and access plan.",
  path: "/browse",
});

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
