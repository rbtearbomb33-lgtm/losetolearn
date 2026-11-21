(() => {
  "use strict";

  const CENTER = { x: 180, y: 180 };
  // All ribbons originate at the true dial center; 60 is straight up.
  const ORIGIN = { x: 180, y: 180 };
  const DIAL_RADIUS = 150;
  const CONTROL_RADIUS = 148;
  const $ = id => document.getElementById(id);

  const hourPath = $("ribbonHour");
  const minutePath = $("ribbonMinute");
  const secondPath = $("ribbonSecond");
  const hourTip = $("ribbonHourTip");
  const hourScale = $("hourScale");
  const minuteTip = $("ribbonMinuteTip");
  const secondTip = $("ribbonSecondTip");

  let model = {
    remaining: 0,
    duration: 3600,
    status: "idle",
    endAt: null,
    pausedRemaining: null,
    startedAt: null
  };

  let waveTime = 0;
  let lastFrame = 0;
  let lastPaint = 0;

  // Positive ray/circle intersection: exact distance from the fixed origin
  // to the inner dial circumference in the requested direction.
  function rayCircleDistance(angle) {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const ox = ORIGIN.x - CENTER.x;
    const oy = ORIGIN.y - CENTER.y;
    const b = ox * vx + oy * vy;
    const c = ox * ox + oy * oy - DIAL_RADIUS * DIAL_RADIUS;
    const discriminant = Math.max(0, b * b - c);
    return Math.max(0, -b + Math.sqrt(discriminant));
  }

  function pointOnRay(angle, distance) {
    return {
      x: ORIGIN.x + Math.cos(angle) * distance,
      y: ORIGIN.y + Math.sin(angle) * distance
    };
  }

  function clampControl(point) {
    const dx = point.x - CENTER.x;
    const dy = point.y - CENTER.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CONTROL_RADIUS) return point;
    const scale = CONTROL_RADIUS / distance;
    return {
      x: CENTER.x + dx * scale,
      y: CENTER.y + dy * scale
    };
  }

  // A soft, changing cubic ribbon. Both control points remain inside the dial;
  // by the convex-hull property, the whole Bezier curve stays inside as well.
  function drawRibbon(path, tip, angle, wave, seed, bend, width, maxLength = Infinity) {
    if (!path || !tip) return;

    const distance = Math.min(rayCircleDistance(angle), maxLength);
    const end = pointOnRay(angle, distance);
    const dx = end.x - ORIGIN.x;
    const dy = end.y - ORIGIN.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;

    const swayA = Math.sin(waveTime * 1.15 + seed) * wave;
    const swayB = Math.cos(waveTime * .82 + seed * 1.63) * wave * .72;
    const swayC = Math.sin(waveTime * .53 + seed * .7) * wave * .24;

    const c1 = clampControl({
      x: ORIGIN.x + dx * .31 + nx * (length * bend + swayA),
      y: ORIGIN.y + dy * .31 + ny * (length * bend + swayA)
    });
    const c2 = clampControl({
      x: ORIGIN.x + dx * .74 - nx * (length * bend * .42 + swayB + swayC),
      y: ORIGIN.y + dy * .74 - ny * (length * bend * .42 + swayB + swayC)
    });

    path.setAttribute("d",
      `M ${ORIGIN.x} ${ORIGIN.y} C ` +
      `${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ` +
      `${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ` +
      `${end.x.toFixed(2)} ${end.y.toFixed(2)}`
    );
    tip.setAttribute("cx", end.x.toFixed(2));
    tip.setAttribute("cy", end.y.toFixed(2));
    tip.setAttribute("r", width);
  }

  function elapsedSeconds(now) {
    if (model.status === "running" && Number.isFinite(model.startedAt)) {
      return Math.max(0, (now - model.startedAt) / 1000);
    }
    if (model.status === "running" && Number.isFinite(model.endAt)) {
      const exactRemaining = Math.max(0, (model.endAt - now) / 1000);
      return Math.max(0, model.duration - exactRemaining);
    }
    if (model.status === "paused" && Number.isFinite(model.pausedRemaining)) {
      return Math.max(0, model.duration - model.pausedRemaining);
    }
    return 0;
  }

  function paint(now) {
    const active = model.status === "running" || model.status === "paused";
    let elapsed = active ? elapsedSeconds(now) : 0;
    if (model.status === "running" && Number.isFinite(model.startedAt) && now - model.startedAt < 80) elapsed = 0;
    const remaining = model.status === "running" && Number.isFinite(model.endAt)
      ? Math.max(0, (model.endAt - now) / 1000)
      : (model.status === "paused" ? Math.max(0, model.pausedRemaining || 0) : 0);

    // Hour hand appears only while more than 60 minutes remain.
    const showHour = active && remaining > 3600;
    if (hourPath) hourPath.style.display = showHour ? "" : "none";
    if (hourTip) hourTip.style.display = showHour ? "" : "none";
    if (hourScale) hourScale.style.display = showHour ? "" : "none";

    // The minute hand is a real clock minute hand: exactly 6 degrees per
    // elapsed minute, continuously interpolated between minute marks.
    // Under/equal to one hour it is longer; above one hour it is shorter.
    const minuteLength = remaining <= 3600 ? 184 : 128;
    const minuteAngle = (-Math.PI / 2) + elapsed * (2 * Math.PI / 3600); // 60刻度为零点
    drawRibbon(minutePath, minuteTip, minuteAngle, 6.8, 2.2, .16, 3.8, minuteLength);

    // The hour hand advances at 30 degrees per elapsed hour (12-hour dial).
    if (showHour) {
      const hourAngle = -Math.PI / 2 + elapsed * (2 * Math.PI / 43200);
      drawRibbon(hourPath, hourTip, hourAngle, 8.2, .4, .19, 4.2, 172);
    }

    // The second-hand TIP now moves continuously: one full revolution per
    // 60 elapsed seconds. Its length is recalculated every animation frame
    // from the off-centre pivot to the circumference, so it visibly changes.
    // Seconds move only during an actively running study session.
    // Idle and paused states are frozen at the 12 o'clock position / elapsed position.
    const secondElapsed = model.status === "running" ? elapsed : (model.status === "paused" ? elapsed : 0);
    const secondAngle = (-Math.PI / 2) + (secondElapsed % 60) * (2 * Math.PI / 60); // 60刻度为零点
    drawRibbon(secondPath, secondTip, secondAngle, 7.5, 4.6, .12, 3.4);

    // Inner minute scale is intentionally fixed at 60 / 45 / 30 / 15.
    // The outer 1 / 2 / 3 hour scale appears only while more than 60 minutes remain.
  }

  function frame(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const delta = Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;

    if (!document.hidden) {
      // The ribbons flow only while studying. Idle and paused states freeze completely.
      if (model.status === "running") waveTime += delta * 1.35;
      paint(Date.now());
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
        pausedRemaining: Number.isFinite(next.pausedRemaining) ? next.pausedRemaining : null,
        startedAt: Number.isFinite(next.startedAt) ? next.startedAt : null
      };
      paint(Date.now());
    }
  };

  paint(Date.now());
  requestAnimationFrame(frame);
})();
