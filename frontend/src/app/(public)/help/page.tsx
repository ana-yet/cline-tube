import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Help Center",
  description: "Find answers to frequently asked questions about CineTube.",
};

const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I create an account?",
        a: 'Click the "Sign In" button in the top right corner, then select "Create Account." Fill in your name, email, and password to get started.',
      },
      {
        q: "Is CineTube free to use?",
        a: "Yes! CineTube offers a free tier that lets you browse the catalog, submit reviews, and create a watchlist. Premium plans unlock exclusive content and an ad-free experience.",
      },
      {
        q: "How do I reset my password?",
        a: 'Click "Forgot Password" on the login page and enter your email. If email delivery is available, you\'ll receive a reset link. Otherwise, contact support.',
      },
    ],
  },
  {
    title: "Reviews & Ratings",
    items: [
      {
        q: "How do reviews work?",
        a: "Any registered user can submit a review for a movie or series. Reviews go through a moderation process before being published. Once approved, they appear on the media page and contribute to the average rating.",
      },
      {
        q: "Can I edit my review?",
        a: "Yes, you can edit your own review at any time. Note that editing resets the review to pending status — it will need to be approved again before appearing publicly.",
      },
      {
        q: "What is the spoiler warning?",
        a: "When writing a review, you can mark it as containing spoilers. Reviews with spoiler warnings are blurred by default and readers must click to reveal the content.",
      },
    ],
  },
  {
    title: "Subscription & Billing",
    items: [
      {
        q: "What are the subscription plans?",
        a: "CineTube offers Monthly ($9.99/month) and Annual ($99.99/year, save 17%) premium plans. Both plans give you access to all premium content and an ad-free experience.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Go to your Profile page and find the Subscription section. Click Cancel Subscription — your access will continue until the end of the current billing period.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards through our secure payment processor, Stripe.",
      },
    ],
  },
  {
    title: "Watchlist & Profile",
    items: [
      {
        q: "How do I add movies to my watchlist?",
        a: 'Click the "Add to Watchlist" button on any media detail page. You can view and manage your watchlist from the Watchlist page.',
      },
      {
        q: "Can I update my profile picture?",
        a: "Yes! Go to your Profile page and click on the image area to upload a new profile picture. You can also remove it at any time.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Help Center
        </h1>
        <p className="text-muted-foreground">
          Find answers to the most common questions about CineTube.
        </p>
      </section>

      {FAQ_SECTIONS.map((section) => (
        <section key={section.title} className="mb-10">
          <h2 className="text-xl font-bold mb-4">{section.title}</h2>
          <Accordion className="w-full">
            {section.items.map((item, i) => (
              <AccordionItem key={i} value={`${section.title}-${i}`}>
                <AccordionTrigger className="text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}

      <section className="text-center mt-16 pt-8 border-t">
        <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
        <p className="text-muted-foreground mb-6">
          Can&apos;t find what you&apos;re looking for? Get in touch with our
          support team.
        </p>
        <Link href="/contact">
          <Button>Contact Support</Button>
        </Link>
      </section>
    </main>
  );
}
