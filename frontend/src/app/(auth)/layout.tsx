import { Film } from "lucide-react";
import Link from "next/link";

/**
 * Auth Layout
 *
 * Shared layout for login, register, forgot-password, reset-password.
 * Two-column design: brand panel (desktop) + form area.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Left: Brand Panel (desktop only) */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-red-950/40" />
        <div className="relative z-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-500 hover:text-red-400 transition-colors"
          >
            <Film className="h-6 w-6 fill-red-500" />
            <span>CineTube</span>
          </Link>
        </div>
        <div className="relative z-10 space-y-4 max-w-lg">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Your cinematic journey starts here
          </h2>
          <p className="text-zinc-300 text-lg">
            Discover, rate, and review movies and series with the CineTube
            community.
          </p>
        </div>
        <div className="relative z-10 text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} CineTube. All rights reserved.
        </div>
      </div>

      {/* Right: Form Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-col justify-center px-6 py-12 md:px-12 lg:px-20 relative bg-background"
      >
        {/* Mobile brand header */}
        <div className="lg:hidden mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-500 hover:text-red-400 transition-colors"
          >
            <Film className="h-6 w-6 fill-red-500" />
            <span>CineTube</span>
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
