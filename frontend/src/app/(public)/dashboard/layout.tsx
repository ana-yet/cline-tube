import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Member Dashboard",
  description:
    "View your CineTube watchlist, reviews, profile progress, and account activity.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
