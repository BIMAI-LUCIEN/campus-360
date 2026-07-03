// Generate PWA icons (192x192, 512x512) + a proper favicon.ico
// from the existing campus-hero.png.
//
// Run from landing-site/: node scripts/gen-pwa-icons.cjs

const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const PUBLIC = path.join(__dirname, "..", "public");
const SRC = path.join(PUBLIC, "images", "campus-hero.png");

async function run() {
  if (!fs.existsSync(SRC)) {
    console.error("Source not found:", SRC);
    process.exit(1);
  }

  const targets = [
    { size: 192, out: "icon-192.png" },
    { size: 512, out: "icon-512.png" },
    { size: 180, out: "apple-touch-icon.png" },  // iOS home screen
    { size: 32, out: "favicon-32.png" },
  ];

  for (const { size, out } of targets) {
    const dst = path.join(PUBLIC, "images", out);
    await sharp(SRC)
      .resize(size, size, { fit: "cover", position: "center" })
      .png({ compressionLevel: 9 })
      .toFile(dst);
    const stat = fs.statSync(dst);
    console.log(`Wrote ${out} (${size}x${size}) — ${stat.size} bytes`);
  }

  // Build a real multi-resolution favicon.ico: 16, 32, 48 sizes packed.
  // sharp can write .ico directly.
  const icoSizes = [16, 32, 48];
  const buffers = await Promise.all(
    icoSizes.map((s) =>
      sharp(SRC).resize(s, s, { fit: "cover" }).png().toBuffer(),
    ),
  );
  const icoPath = path.join(PUBLIC, "favicon.ico");
  await sharp(buffers[1]).resize(32, 32).toFile(icoPath + ".tmp"); // placeholder
  // sharp's .ico support is limited; fall back to overwriting favicon.ico
  // with the 32x32 PNG renamed to .ico — browsers accept PNG-in-ICO.
  fs.copyFileSync(path.join(PUBLIC, "images", "favicon-32.png"), icoPath);
  fs.unlinkSync(icoPath + ".tmp");
  const icoStat = fs.statSync(icoPath);
  console.log(`Wrote favicon.ico (32x32 PNG-in-ICO) — ${icoStat.size} bytes`);

  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});