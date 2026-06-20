"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Film, LayoutDashboard, Database, ShieldAlert, ArrowLeft, LogOut, Menu, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarLinks = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Manage Media", href: "/admin/media", icon: Database },
    { label: "Moderate Reviews", href: "/admin/reviews", icon: ShieldAlert },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-400 border-r border-zinc-900 justify-between">
      <div className="space-y-6 py-6 px-4">
        {/* Brand header */}
        <div className="flex items-center gap-2 px-3">
          <Film className="h-6 w-6 text-red-500 fill-red-500" />
          <span className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            CineTube <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] uppercase hover:bg-red-500/10">Admin</Badge>
          </span>
        </div>

        {/* User Card */}
        <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-3.5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-red-650 to-amber-500 flex items-center justify-center text-white text-xs font-bold font-mono shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate">{user?.name || "Administrator"}</p>
            <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-0.5 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-red-500" />
              <span>SUPERUSER</span>
            </p>
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-1.5 pt-4">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            const LinkIcon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group/link",
                  isActive
                    ? "bg-red-500/10 text-red-400 font-bold border-l-2 border-red-500 rounded-l-none"
                    : "hover:bg-zinc-900/40 hover:text-white"
                )}
              >
                <LinkIcon className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-red-400" : "text-zinc-500 group-hover/link:text-white"
                )} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom links */}
      <div className="p-4 border-t border-zinc-900 space-y-2">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start text-xs font-semibold gap-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/50">
            <ArrowLeft className="h-4 w-4 text-zinc-500" />
            <span>Return to Site</span>
          </Button>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-zinc-900/30 rounded-lg transition-colors text-left"
        >
          <LogOut className="h-4 w-4 text-zinc-500" />
          <span>Admin Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white selection:bg-red-650/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-zinc-900">
        <SidebarContent />
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
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            >
              <SidebarContent />
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
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest font-mono">
              {pathname === "/admin" ? "Overview" : pathname.includes("/admin/media") ? "Media Catalog" : "Review Moderation"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold underline underline-offset-4">
              View Public CineTube
            </Link>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Simple inline Badge wrapper to prevent dependencies issues
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}
