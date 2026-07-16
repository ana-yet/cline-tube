export const metadata = {
  title: "Privacy Policy",
  description: "CineTube Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground mb-12">
        Last updated: July 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to CineTube. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our platform. By
            using CineTube, you agree to the collection and use of information in
            accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We collect information you provide directly, including:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
            <li><strong>Profile Information:</strong> Bio, favorite genres, website, and social media links you choose to share.</li>
            <li><strong>Content:</strong> Reviews, ratings, comments, and watchlist entries you create.</li>
            <li><strong>Contact Submissions:</strong> Messages you send through our contact form.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">3. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            We use your information to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Provide and maintain the CineTube platform.</li>
            <li>Process your reviews, ratings, and watchlist entries.</li>
            <li>Manage your subscription and billing.</li>
            <li>Send important account and service updates.</li>
            <li>Improve our platform based on usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">4. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including encrypted
            password storage (bcrypt), secure JWT-based authentication, HttpOnly
            cookies for refresh tokens, and HTTPS encryption. While no method of
            transmission over the Internet is 100% secure, we strive to protect your
            personal information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">5. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use Stripe for payment processing and Cloudinary for image hosting.
            These services have their own privacy policies. We do not store your
            full credit card information on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">6. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Access, update, or delete your account information.</li>
            <li>Request a copy of your personal data.</li>
            <li>Opt out of non-essential communications.</li>
            <li>Request account deletion (subject to legal retention requirements).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">7. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us
            through our <a href="/contact" className="text-primary hover:underline">contact page</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
