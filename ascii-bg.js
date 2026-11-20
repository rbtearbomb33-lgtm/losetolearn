(() => {
  "use strict";
  const canvas = document.getElementById("asciiBackground");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const dial = document.getElementById("timerArt");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0, height = 0, dpr = 1, last = 0, time = 0;
  const glyphs = [".", "·", ":", ";", "+", "░", "▒", " "];
  const fishArt = [
    "       .:--:.       ",
    "   .-==/::::\\==-.",
    " <==/::####::\\===>",
    "   '-==\\::::/==-’",
    "       '----'      "
  ];
  const fish = [
    { phase: .1, speed: .19, y: .19, scale: .92, dir: 1, alpha: .58, seed: 2 },
    { phase: 2.4, speed: -.15, y: .78, scale: .76, dir: -1, alpha: .42, seed: 7 },
    { phase: 4.5, speed: .12, y: .42, scale: .62, dir: 1, alpha: .30, seed: 11 }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearDialZone() {
    if (!dial) return;
    const r = dial.getBoundingClientRect();
    if (r.bottom < 0 || r.top > height) return;
    const pad = 20;
    // Even-odd clipping leaves a truly blank rectangular window over the dial.
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(
      Math.max(0, r.left - pad),
      Math.max(0, r.top - pad),
      Math.min(width, r.width + pad * 2),
      Math.min(height, r.height + pad * 2)
    );
    ctx.clip("evenodd");
  }

  function drawDotField() {
    const step = 17;
    for (let y = 12; y < height; y += step) {
      for (let x = 9; x < width; x += step) {
        const wave = Math.sin(x * .018 + time * .36) * Math.cos(y * .021 - time * .27);
        const threshold = .76 + wave * .09;
        const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (noise > threshold) continue;
        ctx.globalAlpha = .10 + (1 - noise) * .14;
        ctx.fillStyle = "#303036";
        ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(noise > .91 ? "·" : ".", x, y);
      }
    }
  }

  function drawFish(item, index) {
    const font = Math.max(7, Math.min(11, width / 38)) * item.scale;
    const cellW = font * .72;
    const cellH = font * 1.02;
    const totalW = fishArt[0].length * cellW;
    const travel = width + totalW + 60;
    const rawX = ((item.phase + time * item.speed) % 1 + 1) % 1;
    const x = rawX * travel - totalW - 30;
    const centerY = height * item.y + Math.sin(time * .55 + item.seed) * height * .045;
    const y = centerY - fishArt.length * cellH / 2;

    ctx.save();
    ctx.translate(x + totalW / 2, centerY);
    if (item.dir < 0) ctx.scale(-1, 1);
    ctx.translate(-totalW / 2, -centerY);
    ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textBaseline = "top";

    for (let row = 0; row < fishArt.length; row++) {
      for (let col = 0; col < fishArt[row].length; col++) {
        const base = fishArt[row][col];
        if (base === " ") continue;
        const wobble = Math.sin(time * 1.7 + col * .55 + row * .8 + item.seed);
        const px = x + col * cellW + wobble * 1.2;
        const py = y + row * cellH + Math.sin(time * 1.35 + col * .42 + item.seed) * 1.5;
        const sparkle = Math.sin(time * 2.2 + col * 1.7 + row + item.seed);
        const char = sparkle > .72 ? glyphs[(col + row + index) % 6] : base;
        ctx.globalAlpha = item.alpha * (.48 + (sparkle + 1) * .24);
        ctx.fillStyle = sparkle > .68 ? "#151519" : "#55555b";
        ctx.fillText(char, px, py);
      }
    }

    // Loose ASCII particles trail behind the body and gently disperse.
    for (let p = 0; p < 18; p++) {
      const tailX = x + (item.dir > 0 ? -1 : 1) * (8 + p * 3.1) * cellW / 3;
      const tailY = centerY + Math.sin(time * 1.1 + p * .7 + item.seed) * (4 + p * .22);
      ctx.globalAlpha = item.alpha * Math.max(0, .28 - p * .012);
      ctx.fillStyle = "#68686e";
      ctx.fillText(p % 3 === 0 ? ":" : "·", tailX, tailY);
    }
    ctx.restore();
  }

  function render(now) {
    if (!last) last = now;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!document.hidden && !reduceMotion) time += dt;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    clearDialZone();
    drawDotField();
    fish.forEach(drawFish);
    ctx.restore();
    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { last = 0; });
  requestAnimationFrame(render);
})();
