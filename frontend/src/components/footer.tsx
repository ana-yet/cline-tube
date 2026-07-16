"use client";

import Link from "next/link";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 text-zinc-400 text-sm">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-500 hover:text-red-400 transition-colors"
            >
              <Film className="h-6 w-6 fill-red-500" />
              <span>CineTube</span>
            </Link>
            <p className="text-zinc-500 max-w-sm">
              Discover, rate, and review your favorite movies and series.
              CineTube is a premium community platform built for film and
              television enthusiasts around the globe.
            </p>
            <div className="flex items-center gap-4 text-zinc-500 pt-2">
              <Link href="/contact" className="hover:text-white transition-colors text-sm">
                Contact Us
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-zinc-200 mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/browse"
                  className="hover:text-white transition-colors"
                >
                  Browse Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/watchlist"
                  className="hover:text-white transition-colors"
                >
                  My Watchlist
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-white transition-colors"
                >
                  Premium Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-zinc-200 mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="hover:text-white transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h4 className="font-semibold text-zinc-200 mb-4">Popular Genres</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/browse?genre=Action"
                  className="hover:text-white transition-colors"
                >
                  Action
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?genre=Drama"
                  className="hover:text-white transition-colors"
                >
                  Drama
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?genre=Sci-Fi"
                  className="hover:text-white transition-colors"
                >
                  Sci-Fi
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?genre=Thriller"
                  className="hover:text-white transition-colors"
                >
                  Thriller
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-zinc-200 mb-2">Subscribe</h4>
            <p className="text-zinc-500 text-xs">
              Subscribe to our newsletter to receive the latest updates, movie
              releases, and reviews directly in your inbox.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                required
              />
              <Button
                type="submit"
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-zinc-900 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <p>
            &copy; {new Date().getFullYear()} CineTube. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="hover:text-zinc-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-zinc-400 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/help"
              className="hover:text-zinc-400 transition-colors"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
