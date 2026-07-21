import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact CineTube",
  description:
    "Contact the CineTube team for account, billing, content, or platform support questions.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
