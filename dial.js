(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const CENTER = { x: 180, y: 180 };
  const ORIGIN = { x: 236, y: 262 };
  const DIAL_RADIUS = 150;       // inside the tick marks
  const CONTROL_RADIUS = 145;    // keep the entire Bezier curve inside the dial
  const $ = id => document.getElementById(id);

  const hourPath = $("ribbonHour");
  const minutePath = $("ribbonMinute");
  const secondPath = $("ribbonSecond");
  const hourTip = $("ribbonHourTip");
  const minuteTip = $("ribbonMinuteTip");
  const secondTip = $("ribbonSecondTip");

  let model = {
    remaining: 0,
    duration: 3600,
    status: "idle",
    endAt: null,
    pausedRemaining: null
  };
  let phase = 0;
  let lastFrame = 0;
  let lastSecondAngle = -Math.PI / 2;

  function rayCircleDistance(angle) {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const ox = ORIGIN.x - CENTER.x;
    const oy = ORIGIN.y - CENTER.y;
    const b = ox * vx + oy * vy;
    const c = ox * ox + oy * oy - DIAL_RADIUS * DIAL_RADIUS;
    const disc = Math.max(0, b * b - c);
    return Math.max(0, -b + Math.sqrt(disc));
  }

  function pointOnRay(angle, distance) {
    return {
      x: ORIGIN.x + Math.cos(angle) * distance,
      y: ORIGIN.y + Math.sin(angle) * distance
    };
  }

  function clampToControlCircle(p) {
    const dx = p.x - CENTER.x;
    const dy = p.y - CENTER.y;
    const d = Math.hypot(dx, dy);
    if (d <= CONTROL_RADIUS) return p;
    const k = CONTROL_RADIUS / d;
    return { x: CENTER.x + dx * k, y: CENTER.y + dy * k };
  }

  function drawRibbon(path, tip, angle, distance, wave, seed, thickness) {
    if (!path || !tip) return;
    const end = pointOnRay(angle, distance);
    const dx = end.x - ORIGIN.x;
    const dy = end.y - ORIGIN.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;

    // Traveling waves deform the whole ribbon, not just its endpoint.
    const a = Math.sin(phase * 1.13 + seed) * wave;
    const b = Math.cos(phase * .79 + seed * 1.7) * wave * .72;
    const c1 = clampToControlCircle({
      x: ORIGIN.x + dx * .30 + nx * (a + length * .12),
      y: ORIGIN.y + dy * .30 + ny * (a + length * .12)
    });
    const c2 = clampToControlCircle({
      x: ORIGIN.x + dx * .73 - nx * (b + length * .055),
      y: ORIGIN.y + dy * .73 - ny * (b + length * .055)
    });

    path.setAttribute("d",
      `M ${ORIGIN.x} ${ORIGIN.y} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ` +
      `${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
    );
    tip.setAttribute("cx", end.x.toFixed(2));
    tip.setAttribute("cy", end.y.toFixed(2));
    tip.setAttribute("r", thickness);
  }

  function currentElapsed() {
    if (model.status === "running" && Number.isFinite(model.endAt)) {
      return Math.max(0, model.duration - Math.max(0, (model.endAt - Date.now()) / 1000));
    }
    if (model.status === "paused" && Number.isFinite(model.pausedRemaining)) {
      return Math.max(0, model.duration - model.pausedRemaining);
    }
    return 0;
  }

  function paint() {
    const active = model.status === "running" || model.status === "paused";
    const remaining = active ? Math.max(0, model.remaining) : 0;
    const elapsed = currentElapsed();

    // Hour ribbon is governed by remaining time, never by the original session duration.
    const showHour = active && remaining > 3600;
    hourPath.style.display = showHour ? "" : "none";
    hourTip.style.display = showHour ? "" : "none";

    // Under one hour, the minute ribbon lengthens to occupy the available dial space.
    const minuteLength = active && remaining <= 3600 ? 184 : 128;
    const minutePhase = active ? ((elapsed % 3600) / 3600) : 0;
    const minuteAngle = -1.62 + minutePhase * .58 +
      Math.sin(phase * .22 + 1.1) * .018;
    const minuteDistance = Math.min(minuteLength, rayCircleDistance(minuteAngle));
    drawRibbon(minutePath, minuteTip, minuteAngle, minuteDistance, 8.5, 2.2, 3.8);

    if (showHour) {
      const hourPhase = (elapsed % 7200) / 7200;
      const hourAngle = -2.38 + hourPhase * .48 +
        Math.sin(phase * .16 + .4) * .014;
      const hourDistance = Math.min(172, rayCircleDistance(hourAngle));
      drawRibbon(hourPath, hourTip, hourAngle, hourDistance, 9.5, .4, 4.2);
    }

    // Continuous second sweep: sub-second time, full circular travel, variable ray length.
    // Idle preview uses a gentle sweep too, so motion is visible before starting a session.
    const seconds = active ? elapsed : (performance.now() / 1000);
    const secondFraction = ((seconds % 60) + 60) % 60 / 60;
    const secondAngle = -Math.PI / 2 + secondFraction * Math.PI * 2;
    lastSecondAngle = secondAngle;
    const secondDistance = rayCircleDistance(secondAngle);
    drawRibbon(secondPath, secondTip, secondAngle, secondDistance,
      7.5, 4.6, 3.4);

    const shownMinutes = active ? Math.max(1, Math.ceil(remaining / 60)) : 60;
    const marks = [
      shownMinutes,
      Math.max(1, Math.round(shownMinutes * .75)),
      Math.max(1, Math.round(shownMinutes * .5)),
      Math.max(1, Math.round(shownMinutes * .25))
    ];
    ["dialTop", "dialRight", "dialBottom", "dialLeft"].forEach((id, i) => {
      const el = $(id);
      if (el) el.textContent = marks[i];
    });
  }

  function frame(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const dt = Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (!document.hidden) {
      phase += dt * (model.status === "running" ? 1.65 : .8);
      paint();
    }
    requestAnimationFrame(frame);
  }

  window.LoseStudyDial = {
    update(next) {
      if (!next) return;
      model = {
        remaining: Number(next.remaining) || 0,
        duration: Math.max(1, Number(next.duration) || 3600),
        status: next.status || "idle",
        endAt: Number.isFinite(next.endAt) ? next.endAt : null,
        pausedRemaining: Number.isFinite(next.pausedRemaining) ? next.pausedRemaining : null
      };
      paint();
    }
  };

  paint();
  requestAnimationFrame(frame);
})();
