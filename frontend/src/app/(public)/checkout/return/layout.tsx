import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Checkout Return",
  description: "CineTube checkout verification and account access status.",
  path: "/checkout/return",
  noIndex: true,
});

export default function CheckoutReturnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
