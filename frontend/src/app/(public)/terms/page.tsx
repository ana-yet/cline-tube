export const metadata = {
  title: "Terms of Service",
  description:
    "CineTube Terms of Service — rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-muted-foreground mb-12">
        Last updated: July 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-3">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using CineTube, you agree to be bound by these Terms
            of Service. If you do not agree to these terms, please do not use
            our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">2. Account Registration</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must provide accurate and complete information when creating an
            account. You are responsible for maintaining the security of your
            account credentials. You must be at least 13 years old to create an
            account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">3. User Content</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            By submitting reviews, ratings, or comments on CineTube:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>You retain ownership of your content.</li>
            <li>
              You grant CineTube a license to display and distribute your
              content on the platform.
            </li>
            <li>
              You agree not to submit false, misleading, or plagiarized content.
            </li>
            <li>
              Content containing spoilers should be marked with a spoiler
              warning.
            </li>
            <li>
              We reserve the right to moderate, edit, or remove content that
              violates our guidelines.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">
            4. Subscriptions & Billing
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Premium subscriptions are billed through Stripe. By subscribing:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Monthly plans renew automatically each month.</li>
            <li>Annual plans renew automatically each year.</li>
            <li>
              You may cancel at any time — access continues until the end of the
              billing period.
            </li>
            <li>Refund requests are handled on a case-by-case basis.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">5. Prohibited Conduct</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Use the platform for any illegal purpose.</li>
            <li>
              Attempt to gain unauthorized access to other accounts or systems.
            </li>
            <li>Submit automated reviews or manipulate ratings.</li>
            <li>Harass, abuse, or threaten other users.</li>
            <li>
              Scrape, copy, or redistribute platform content without permission.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">
            6. Limitation of Liability
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            CineTube is provided &ldquo;as is&rdquo; without warranties of any
            kind. We are not liable for any indirect, incidental, or
            consequential damages arising from your use of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">7. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these Terms of Service from time to time. We will
            notify users of significant changes through the platform or email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">8. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about these terms? Contact us through our{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact page
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
