import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "CineTube Blog",
  description:
    "Read CineTube updates, movie and series guides, platform news, and community stories.",
  path: "/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
