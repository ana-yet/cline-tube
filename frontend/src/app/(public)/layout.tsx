import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cline-tube.vercel.app";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CineTube",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/browse?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
