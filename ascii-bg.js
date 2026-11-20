import { OceanEngine } from "https://esm.sh/gh/stackedlol/ascii-sharks@fff1af0a4d1ba6315d02982bd904b83ca016a14e/src/index.ts?bundle";

(() => {
  "use strict";

  const canvas = document.getElementById("asciiBackground");
  const glass = document.getElementById("sharkGlass");
  const dial = document.getElementById("timerArt");
  if (!canvas) return;

  // Keep the canvas fixed to the visible screen. It is a visual background
  // layer, not a DOM block, so it never pushes the app down or changes layout.
  const canvasStyle = canvas.style;
  canvasStyle.position = "fixed";
  canvasStyle.inset = "0";
  canvasStyle.width = "100vw";
  canvasStyle.height = "100vh";
  canvasStyle.pointerEvents = "none";

  // The upstream light scene: real articulated sharks, schooling fish,
  // caustic dots, body shading and continuous world simulation.
  // Seven-shark cast follows the upstream light hero composition.
  const sharks = [
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
    ocean = new OceanEngine(canvas, sharks, {
      theme: "light",
      contain: true,
      pointer: false,
      clearCentre: false,
      stage: "full"
    });
  } catch (error) {
    console.error("ASCII Sharks could not start:", error);
    return;
  }

  // A white glass pool sits ABOVE the ocean and BELOW the app UI.
  // Its position follows the actual timer bounds, including the outer hour ring.
  let maskFrame = 0;
  let lastMaskUpdate = 0;

  function updateGlass(now = 0) {
    if (!glass || !dial) return;
    if (now && now - lastMaskUpdate < 32) {
      maskFrame = requestAnimationFrame(updateGlass);
      return;
    }
    lastMaskUpdate = now || performance.now();

    const rect = dial.getBoundingClientRect();
    if (!rect.width || rect.bottom < -400 || rect.top > window.innerHeight + 400) {
      glass.style.background = "none";
    } else {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // The solid pool extends slightly beyond the SVG dial itself.
      // The final feather then dissolves the sharks gradually into the paper.
      const coreX = rect.width * 0.53 + 18;
      const coreY = rect.height * 0.53 + 18;
      const featherX = Math.max(42, rect.width * 0.15);
      const featherY = Math.max(42, rect.height * 0.15);
      const outerX = coreX + featherX;
      const outerY = coreY + featherY;
      const coreStop = Math.min(88, Math.max(55, (coreX / outerX) * 100));
      glass.style.background =
        `radial-gradient(ellipse ${outerX}px ${outerY}px at ${cx}px ${cy}px, ` +
        `rgba(255,255,255,1) 0%, ` +
        `rgba(255,255,255,1) ${coreStop}%, ` +
        `rgba(255,255,255,.94) ${Math.min(96, coreStop + 7)}%, ` +
        `rgba(255,255,255,.70) 91%, ` +
        `rgba(255,255,255,.30) 97%, ` +
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

  // Clean up if this page is ever hot-reloaded or navigated away from.
  window.addEventListener("pagehide", () => {
    if (maskFrame) cancelAnimationFrame(maskFrame);
    ocean?.destroy();
  }, { once: true });
})();
