import fs from "fs";
import path from "path";

const files = [
  "src/app/dashboard/page.tsx",
  "src/app/trips/new/page.tsx",
  "src/components/app/WorkspaceMenuOverlay.tsx",
  "src/components/landing/DestinationsGallery.tsx",
  "src/components/landing/FinalCTA.tsx",
  "src/components/landing/Hero.tsx",
  "src/components/landing/HeroVideo.tsx",
  "src/components/landing/HowItWorks.tsx",
  "src/components/landing/WhatWeDo.tsx",
  "src/components/media/TravelImage.tsx",
  "src/components/navigation/MenuOverlay.tsx",
  "src/components/product/DestinationImage.tsx",
];

for (const f of files) {
  const full = path.resolve(process.cwd(), f);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, "utf8");
  // Find all <Image ... />
  const matches = content.match(/<Image[\s\S]*?\/>/g);
  if (matches) {
    for (const m of matches) {
      const hasFill = m.includes("fill");
      const hasSizes = m.includes("sizes");
      console.log(`File: ${f}`);
      console.log(`  hasFill: ${hasFill}, hasSizes: ${hasSizes}`);
      if (hasFill && !hasSizes) {
        console.log(`  >>> MISSING SIZES IN: ${f}`);
        console.log(m);
      }
    }
  }
}
