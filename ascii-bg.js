import { OceanEngine } from "https://esm.sh/gh/stackedlol/ascii-sharks@main/src/index.ts?bundle";

(() => {
  "use strict";

  const canvas = document.getElementById("asciiBackground");
  if (!canvas) return;

  // Fixed viewport background: the canvas never participates in page layout.
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none"
  });

  // Original light-scene cast from stackedlol/ascii-sharks.
  const lightSceneSharks = [
    { kind: "whale", size: 1.05 },
    { kind: "greathammer", size: 0.95 },
    { kind: "whale", size: 0.88 },
    { kind: "thresher", size: 0.85 },
    { kind: "hammerhead", size: 0.85 },
    { kind: "tiger", size: 0.78 },
    { kind: "hammerhead", size: 0.76 }
  ];

  let ocean;
  try {
    ocean = new OceanEngine(canvas, lightSceneSharks, {
      theme: "light",
      contain: true,
      pointer: false,
      clearCentre: false,
      fish: 150,
      stage: "full"
    });
  } catch (error) {
    console.error("Upstream ASCII Sharks engine failed to initialize:", error);
    return;
  }

  window.addEventListener("pagehide", () => ocean?.destroy(), { once: true });
})();
