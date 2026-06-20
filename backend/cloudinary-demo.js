/**
 * Cloudinary Onboarding Script
 *
 * Demonstrates: upload, get details, transform
 * Run with: node cloudinary-demo.js
 */

const cloudinary = require("cloudinary").v2;

// ── 1. Configure Cloudinary (inline credentials) ──────────

cloudinary.config({
  cloud_name: "dtulq61y3",
  api_key: "494852333355711", // ← replace this
  api_secret: "xdEZwKNAqsQwuKuoMEWodlA8zyM", // ← replace this
});

async function main() {
  // ── 2. Upload an image ──────────────────────────────────

  console.log("📤 Uploading image...\n");

  const uploadResult = await cloudinary.uploader.upload(
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    { folder: "cinetube-demo" },
  );

  console.log("✅ Upload successful!");
  console.log("   Secure URL:", uploadResult.secure_url);
  console.log("   Public ID:", uploadResult.public_id);
  console.log();

  // ── 3. Get image details ────────────────────────────────

  console.log("📋 Image details:\n");

  const details = await cloudinary.api.resource(uploadResult.public_id);

  console.log("   Width:", details.width, "px");
  console.log("   Height:", details.height, "px");
  console.log("   Format:", details.format);
  console.log("   Size:", details.bytes, "bytes");
  console.log();

  // ── 4. Transform the image ──────────────────────────────
  //
  // f_auto — automatically selects the best format (WebP, AVIF, etc.)
  //          based on browser support, reducing file size.
  // q_auto — automatically adjusts quality based on content,
  //          balancing visual quality and file size.

  const transformedUrl = cloudinary.url(uploadResult.public_id, {
    transformation: [{ fetch_format: "auto", quality: "auto" }],
  });

  console.log(
    "🔗 Done! Click link below to see optimized version of the image.",
  );
  console.log("   Check the size and the format.\n");
  console.log("   " + transformedUrl);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
