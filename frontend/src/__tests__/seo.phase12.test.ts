import { describe, expect, it } from "vitest";
import { pageMetadata } from "@/lib/seo";

describe("Phase 12 SEO metadata", () => {
  it("builds canonical and social metadata for public pages", () => {
    const metadata = pageMetadata({
      title: "Browse Movies and Series",
      description: "Explore CineTube titles.",
      path: "/browse",
    });

    expect(metadata.title).toBe("Browse Movies and Series");
    expect(metadata.description).toBe("Explore CineTube titles.");
    expect(metadata.alternates).toEqual({
      canonical: "https://cline-tube.vercel.app/browse",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Browse Movies and Series",
      description: "Explore CineTube titles.",
      url: "https://cline-tube.vercel.app/browse",
      siteName: "CineTube",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "Browse Movies and Series",
    });
  });

  it("marks private pages as noindex", () => {
    const metadata = pageMetadata({
      title: "Profile",
      description: "Manage your CineTube profile.",
      path: "/profile",
      noIndex: true,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
