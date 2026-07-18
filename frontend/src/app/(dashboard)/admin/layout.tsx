"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  LayoutDashboard,
  Database,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  CreditCard,
  MessageSquare,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Media", href: "/admin/media", icon: Database },
  { label: "Reviews", href: "/admin/reviews", icon: ShieldAlert },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Contacts", href: "/admin/contacts", icon: MessageSquare },
  { label: "Content", href: "/admin/content", icon: FileText },
];

function SidebarContent({
  pathname,
  user,
  onLogout,
  onNavigate,
}: {
  pathname: string;
  user: { name?: string | null };
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between border-r border-zinc-900 bg-zinc-950 text-zinc-400">
      <div className="space-y-6 px-4 py-6">
        <div className="flex items-center gap-2 px-3">
          <Film className="h-6 w-6 fill-red-500 text-red-500" aria-hidden="true" />
          <span className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-white">
            CineTube{" "}
            <Badge className="border border-red-500/20 bg-red-500/10 text-[9px] uppercase text-red-400 hover:bg-red-500/10">
              Admin
            </Badge>
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-900/30 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-red-650 to-amber-500 font-mono text-xs font-bold text-white">
            {user.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-zinc-200">
              {user.name || "Administrator"}
            </p>
            <p className="mt-0.5 flex items-center gap-0.5 font-mono text-[10px] text-zinc-500">
              <ShieldCheck className="h-3 w-3 text-red-500" aria-hidden="true" />
              <span>SUPERUSER</span>
            </p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="space-y-1.5 pt-4">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all group/link focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-500/30",
                  isActive
                    ? "rounded-l-none border-l-2 border-red-500 bg-red-500/10 font-bold text-red-400"
                    : "hover:bg-zinc-900/40 hover:text-white",
                )}
              >
                <LinkIcon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-red-400"
                      : "text-zinc-500 group-hover/link:text-white",
                  )}
                  aria-hidden="true"
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-zinc-900 p-4">
        <Link href="/" onClick={onNavigate}>
          <Button
            variant="ghost"
            className="min-h-10 w-full justify-start gap-2.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <span>Return to Site</span>
          </Button>
        </Link>
        <button
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-900/30 hover:text-red-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-500/30"
        >
          <LogOut className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          <span>Admin Log Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || user?.role !== "ADMIN") {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  if (isLoading || !user || user.role !== "ADMIN") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-zinc-950"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading admin dashboard</span>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white selection:bg-red-650/30">
      <a href="#admin-main-content" className="skip-link">
        Skip to admin content
      </a>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-zinc-900">
        <SidebarContent pathname={pathname} user={user} onLogout={logout} />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setMobileOpen(false);
                menuButtonRef.current?.focus();
              }}
              className="fixed inset-0 z-40 bg-black md:hidden"
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            >
              <SidebarContent
                pathname={pathname}
                user={user}
                onLogout={logout}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-zinc-900/80 bg-zinc-950 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              ref={menuButtonRef}
              onClick={() => setMobileOpen(true)}
              className="-ml-2 min-h-10 min-w-10 rounded-lg p-2 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-500/30 md:hidden"
              aria-label="Open admin navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              {pathname === "/admin"
                ? "Overview"
                : pathname.includes("/admin/media")
                  ? "Media Catalog"
                  : "Review Moderation"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold underline underline-offset-4"
            >
              View Public CineTube
            </Link>
          </div>
        </header>

        {/* Content body */}
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
