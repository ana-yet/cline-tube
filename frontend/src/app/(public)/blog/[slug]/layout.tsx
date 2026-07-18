import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog Post",
  description: "Read a CineTube article, update, or guide from the published blog.",
  path: "/blog",
});

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
