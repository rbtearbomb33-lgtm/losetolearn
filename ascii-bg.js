import { OceanEngine } from "https://esm.sh/gh/stackedlol/ascii-sharks@main/src/index.ts?bundle";

(() => {
  "use strict";

  const canvas = document.getElementById("asciiBackground");
  const glass = document.getElementById("sharkGlass");
  const dial = document.getElementById("timerArt");
  if (!canvas) return;

  // A fixed viewport canvas: never participates in document layout.
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none"
  });

  // This is the actual light-scene cast used by the upstream project's
  // pages/light.ts + pages/query.ts, not a locally drawn shark approximation.
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
      clearCentre: true,
      fish: 150,
      stage: "full"
    });
  } catch (error) {
    console.error("Upstream ASCII Sharks engine failed to initialize:", error);
    return;
  }

  // A compact white clearing around the whole dial. The fade is deliberately
  // much tighter than V3.5 so it no longer reaches the colour swatches.
  let maskFrame = 0;
  let lastMaskUpdate = 0;

  function updateGlass(now = 0) {
    if (!glass || !dial) return;
    if (now && now - lastMaskUpdate < 40) {
      maskFrame = requestAnimationFrame(updateGlass);
      return;
    }
    lastMaskUpdate = now || performance.now();

    const rect = dial.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom < -400 || rect.top > window.innerHeight + 400) {
      glass.style.background = "none";
    } else {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // SVG outer tick marks are close to the element bounds. Leave a small
      // clean margin around them, then feather over a short 22–28 px band.
      const coreX = rect.width * 0.495 + 5;
      const coreY = rect.height * 0.495 + 5;
      const featherX = Math.max(22, rect.width * 0.065);
      const featherY = Math.max(22, rect.height * 0.065);
      const outerX = coreX + featherX;
      const outerY = coreY + featherY;

      glass.style.background =
        `radial-gradient(ellipse ${outerX}px ${outerY}px at ${cx}px ${cy}px, ` +
        `rgba(255,255,255,1) 0%, ` +
        `rgba(255,255,255,1) 86%, ` +
        `rgba(255,255,255,.94) 91%, ` +
        `rgba(255,255,255,.72) 96%, ` +
        `rgba(255,255,255,.28) 99%, ` +
        `rgba(255,255,255,0) 100%)`;
    }

    maskFrame = requestAnimationFrame(updateGlass);
  }

  function refreshMask() {
    if (maskFrame) cancelAnimationFrame(maskFrame);
    maskFrame = requestAnimationFrame(updateGlass);
  }

  window.addEventListener("scroll", refreshMask, { passive: true });
  window.addEventListener("resize", refreshMask, { passive: true });
  window.addEventListener("orientationchange", refreshMask, { passive: true });
  if (dial && "ResizeObserver" in window) {
    const observer = new ResizeObserver(refreshMask);
    observer.observe(dial);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshMask();
  });
  refreshMask();

  window.addEventListener("pagehide", () => {
    if (maskFrame) cancelAnimationFrame(maskFrame);
    ocean?.destroy();
  }, { once: true });
})();
