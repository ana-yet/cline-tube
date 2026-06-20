"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Film, Bell, Search, Menu, X, User, LayoutDashboard, LogOut, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Close menus on path change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // Handle scroll effect for translucent navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Browse", href: "/browse" },
    { label: "Watchlist", href: "/watchlist", protected: true },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        isScrolled
          ? "bg-zinc-950/80 backdrop-blur-md border-zinc-800/60 shadow-lg shadow-black/20"
          : "bg-zinc-950 border-zinc-900"
      )}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-500 hover:text-red-400 transition-colors">
            <Film className="h-6 w-6 fill-red-500" />
            <span>CineTube</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              if (link.protected && !isAuthenticated) return null;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-red-500",
                    isActive ? "text-red-500 font-semibold" : "text-zinc-400"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Middle: Elegant Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex relative max-w-sm w-full mx-4">
          <Input
            type="search"
            placeholder="Search movies, series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border-zinc-800 pl-9 pr-4 text-zinc-100 placeholder:text-zinc-500 h-9 rounded-full focus-visible:border-red-500 focus-visible:ring-red-500/20"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
        </form>

        {/* Right Side: Actions (Search, Notification, Profile Dropdown) */}
        <div className="flex items-center gap-4">
          {/* Mobile search trigger or simple search icon */}
          <form onSubmit={handleSearchSubmit} className="sm:hidden flex items-center">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-xs text-white max-w-[100px] focus:max-w-[150px] transition-all"
            />
          </form>

          {/* Notifications area placeholder */}
          <div className="relative cursor-pointer text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-zinc-900 rounded-full">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950 animate-pulse" />
          </div>

          {/* User Section */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-red-500/20 hover:scale-105 transition-transform">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                </div>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 p-2 shadow-xl shadow-black/40 z-40 text-sm"
                    >
                      <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                        <p className="font-semibold text-zinc-200 line-clamp-1">{user.name || "User"}</p>
                        <p className="text-xs text-zinc-500 line-clamp-1">{user.email}</p>
                      </div>

                      <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span>My Profile</span>
                      </Link>

                      <Link href="/watchlist" className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
                        <Heart className="h-4 w-4 text-zinc-500" />
                        <span>Watchlist</span>
                      </Link>

                      {user.role === "ADMIN" && (
                        <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition-colors">
                          <LayoutDashboard className="h-4 w-4 text-red-400" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      <div className="border-t border-zinc-800/80 my-1" />

                      <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 rounded-lg transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4 text-zinc-500" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-900">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-red-600/10">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Hamburger button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-zinc-900 bg-zinc-950 px-4 py-6 space-y-4"
          >
            <nav className="flex flex-col gap-4 text-base font-medium">
              {navLinks.map((link) => {
                if (link.protected && !isAuthenticated) return null;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "transition-colors hover:text-red-500 py-1 border-b border-zinc-900/50",
                      isActive ? "text-red-500 font-semibold" : "text-zinc-400"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {!isAuthenticated && (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Simple internal input wrapper to prevent dependencies import errors
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
