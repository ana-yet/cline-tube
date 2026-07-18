import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign In",
  description: "Sign in to your CineTube account to manage your reviews, watchlist, and premium access.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
