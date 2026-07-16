import { Film, Users, Star, Shield, Heart, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About CineTube",
  description:
    "Learn about CineTube — the community-driven movie and series rating platform.",
};

export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          About CineTube
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A community-driven platform where movie and series enthusiasts discover,
          rate, and share their passion for great storytelling.
        </p>
      </section>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          CineTube was built to create a space where film and television fans can
          discover new content through authentic community reviews, build personal
          watchlists, and engage with a community that shares their passion for
          great storytelling.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Every rating on CineTube comes from a real viewer. We believe in
          transparency — no paid placements, no hidden algorithms. Just honest
          opinions from people who love watching.
        </p>
      </section>

      {/* Features Grid */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8">What We Offer</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Star,
              title: "Honest Ratings",
              desc: "Community-driven reviews with a moderated approval process to ensure quality and authenticity.",
            },
            {
              icon: Film,
              title: "Vast Catalog",
              desc: "Browse movies and series across all genres — from blockbusters to indie gems.",
            },
            {
              icon: Heart,
              title: "Personal Watchlist",
              desc: "Save titles you want to watch and track your viewing journey.",
            },
            {
              icon: Users,
              title: "Community",
              desc: "Join a growing community of film enthusiasts who share reviews and recommendations.",
            },
            {
              icon: Shield,
              title: "Spoiler Protection",
              desc: "Reviews with spoiler warnings are blurred by default — reveal only when you're ready.",
            },
            {
              icon: Zap,
              title: "Premium Content",
              desc: "Unlock exclusive premium movies and series with a subscription plan.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border bg-card"
            >
              <feature.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Start Watching?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of movie enthusiasts on CineTube.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/browse">
            <Button size="lg">Browse Catalog</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">
              Create Account
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
