import React from "react";
import ReactDOMServer from "react-dom/server";

// Let's import the landing components one by one and test renderToString!
async function testComponents() {
  console.log("--- Testing Individual Landing Components with ReactDOMServer.renderToString ---");

  const componentsToTest = [
    { name: "LandingOpeningExperience", importFn: () => import("../src/components/landing/LandingOpeningExperience") },
    { name: "Navbar", importFn: () => import("../src/components/navigation/Navbar") },
    { name: "Hero", importFn: () => import("../src/components/landing/Hero") },
    { name: "HowItWorks", importFn: () => import("../src/components/landing/HowItWorks") },
    { name: "MultiAgentDossierScene", importFn: () => import("../src/components/landing/MultiAgentDossierScene") },
    { name: "DestinationsGallery", importFn: () => import("../src/components/landing/DestinationsGallery") },
    { name: "ContinuousMarquee", importFn: () => import("../src/components/ui/ContinuousMarquee") },
    { name: "FAQSection", importFn: () => import("../src/components/landing/FAQSection") },
    { name: "FinalCTA", importFn: () => import("../src/components/landing/FinalCTA") },
    { name: "Footer", importFn: () => import("../src/components/landing/Footer") },
    { name: "CustomCursor", importFn: () => import("../src/components/ui/CustomCursor") },
  ];

  for (const item of componentsToTest) {
    try {
      const mod: any = await item.importFn();
      const Comp = mod[item.name] || mod.default;
      if (!Comp) {
        console.error(`Component ${item.name} not found in module!`);
        continue;
      }
      // Render component
      const html = ReactDOMServer.renderToString(React.createElement(Comp));
      console.log(`✓ [SUCCESS] ${item.name} rendered cleanly (${html.length} chars)`);
    } catch (err: any) {
      console.error(`❌ [ERROR in ${item.name}]:`, err.message);
      console.error(err.stack);
    }
  }
}

testComponents().catch(console.error);

export {};
