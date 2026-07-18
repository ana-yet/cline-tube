import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reset Password",
  description: "Request a secure password reset link for your CineTube account.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
