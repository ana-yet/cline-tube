import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Profile",
  description:
    "Manage your CineTube profile, password, sessions, image, billing state, and favorite genres.",
  path: "/profile",
  noIndex: true,
});

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
