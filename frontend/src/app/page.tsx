/**
 * Home Page — CineTube Landing
 *
 * Hero section + featured content placeholder.
 * Full implementation deferred to feature development phase.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Welcome to <span className="text-primary">CineTube</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover, rate, and review your favorite movies and series. Join the
          community today.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/browse"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse Catalog
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign In
          </a>
        </div>
      </main>
    </div>
  );
}
