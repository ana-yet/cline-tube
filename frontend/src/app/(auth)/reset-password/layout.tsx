import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Choose New Password",
  description: "Set a new password for your CineTube account using a valid reset link.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
