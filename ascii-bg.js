(() => {
  "use strict";

  const canvas = document.getElementById("asciiBackground");
  const dial = document.getElementById("timerArt");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0, height = 0, dpr = 1, last = 0, time = 0;
  let scrollY = window.scrollY || 0;

  // Character palette: bright, restrained monochrome ASCII pixels.
  const ink = [" ", ".", "·", ":", "+", "*", "#", "%", "@"];

  // A normalized shark silhouette, facing right. Fins and tail are part of
  // the silhouette; individual cells breathe and change glyphs over time.
  const sharkPolygon = [
    [0.02,0.48],[0.10,0.39],[0.21,0.35],[0.32,0.35],
    [0.40,0.18],[0.47,0.34],[0.61,0.32],[0.73,0.36],
    [0.84,0.41],[0.96,0.46],[0.86,0.51],[0.98,0.59],
    [0.83,0.57],[0.73,0.65],[0.62,0.68],[0.52,0.67],
    [0.45,0.88],[0.38,0.68],[0.26,0.66],[0.15,0.61],
    [0.06,0.56]
  ];

  const sharks = [
    { phase:.08, speed:.052, y:.18, scale:1.08, dir:1, alpha:.42, seed:2, size:1 },
    { phase:.57, speed:-.036, y:.79, scale:.82, dir:-1, alpha:.30, seed:7, size:.9 },
    { phase:.31, speed:.027, y:.48, scale:.62, dir:1, alpha:.20, seed:13, size:.8 }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersects = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-8) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function drawShark(item, index) {
    // Size scales with viewport width but remains legible on a phone.
    const sharkW = Math.min(width * .78, 430) * item.scale;
    const sharkH = sharkW * .39;
    const travel = width + sharkW * 1.35;
    const progress = ((item.phase + time * item.speed) % 1 + 1) % 1;
    const x = progress * travel - sharkW * 1.15;
    const centerY = height * item.y +
      Math.sin(time * .31 + item.seed) * Math.min(42, height * .045);
    const y = centerY - sharkH / 2;
    const cols = Math.max(24, Math.round(sharkW / 7.2));
    const rows = Math.max(10, Math.round(sharkH / 7.2));
    const cellW = sharkW / cols;
    const cellH = sharkH / rows;
    const font = Math.max(6, Math.min(10, cellH * .9));

    ctx.save();
    ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let u = (col + .5) / cols;
        const v = (row + .5) / rows;
        if (item.dir < 0) u = 1 - u;
        if (!pointInPolygon(u, v, sharkPolygon)) continue;

        // Small tail/body oscillation creates a swimming motion without
        // breaking the overall silhouette.
        const tailWeight = Math.max(0, (0.25 - u) / .25);
        const wobbleX = Math.sin(time * 2.0 + row * .52 + item.seed) * 1.3 * tailWeight;
        const wobbleY = Math.sin(time * 1.55 + col * .16 + item.seed) *
          (1.1 + tailWeight * 2.4);
        const pulse = Math.sin(time * 1.1 + col * .19 + row * .31 + item.seed);
        const noise = Math.abs(Math.sin(col * 127.1 + row * 311.7 + item.seed * 17.3) * 43758.5453) % 1;
        const glyphIndex = Math.min(ink.length - 1,
          Math.max(1, Math.floor((noise * .52 + (pulse + 1) * .24) * 8)));
        const char = ink[glyphIndex];
        if (char === " ") continue;

        const xPos = x + (col + .5) * cellW + wobbleX;
        const yPos = y + (row + .5) * cellH + wobbleY;
        const shade = .52 + (pulse + 1) * .17;
        ctx.globalAlpha = item.alpha * shade;
        ctx.fillStyle = glyphIndex > 5 ? "#252529" : "#66666c";
        ctx.fillText(char, xPos, yPos);
      }
    }

    // A sparse stream of detached ASCII particles follows the tail.
    for (let p = 0; p < 34; p++) {
      const drift = (time * (10 + p * .12) + p * 19 + item.seed * 11) % 115;
      const tailSide = item.dir > 0 ? -1 : 1;
      const px = x + (item.dir > 0 ? 0 : sharkW) + tailSide * drift;
      const py = centerY + Math.sin(time * .65 + p * .57 + item.seed) *
        (sharkH * (.22 + p / 120));
      if (px < -12 || px > width + 12) continue;
      const fade = Math.max(0, 1 - drift / 120);
      ctx.globalAlpha = item.alpha * .48 * fade;
      ctx.fillStyle = p % 5 === 0 ? "#29292e" : "#77777d";
      ctx.fillText(p % 4 === 0 ? ":" : p % 3 === 0 ? "·" : ".", px, py);
    }
    ctx.restore();
  }

  function drawAmbientParticles() {
    const step = width < 500 ? 23 : 28;
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 15; y < height; y += step) {
      for (let x = 12; x < width; x += step) {
        const wave = Math.sin(x * .014 + time * .22) *
          Math.cos(y * .017 - time * .18);
        const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (noise < .91 + wave * .025) continue;
        ctx.globalAlpha = .12 + (noise - .91) * .7;
        ctx.fillStyle = "#55555b";
        ctx.fillText(noise > .975 ? "·" : ".", x, y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function clearAndFeatherDialZone() {
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    if (rect.bottom < -260 || rect.top > height + 260) return;

    // The protected area is a circular halo around the complete dial,
    // including the outer 1/2/3 hour scale, not just the SVG itself.
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const coreRadius = Math.max(rect.width, rect.height) * .5 + 27;
    const feather = Math.max(38, Math.min(58, rect.width * .14));
    const outerRadius = coreRadius + feather;

    // Fade the background out gradually toward the dial, rather than cutting
    // it off with a hard rectangular clip. Destination-out preserves the
    // white page beneath the canvas.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
    const hardStop = coreRadius / outerRadius;
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(Math.max(.01, hardStop), "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render(now) {
    if (!last) last = now;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!document.hidden && !reduceMotion) time += dt;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    drawAmbientParticles();
    sharks.forEach(drawShark);
    clearAndFeatherDialZone();
    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("orientationchange", resize, { passive: true });
  window.addEventListener("scroll", () => { scrollY = window.scrollY || 0; }, { passive: true });
  document.addEventListener("visibilitychange", () => { last = 0; });
  requestAnimationFrame(render);
})();
