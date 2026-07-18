import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create Account",
  description: "Create a CineTube account to rate titles, write reviews, save watchlists, and unlock premium access.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
