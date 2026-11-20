(() => {
  "use strict";
  // Subtle halftone "character ocean": monochrome dots drift like a slow surface current.
  function initOcean() {
    const canvas = document.getElementById("oceanCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, height = 0, dpr = 1, raf = 0, last = 0, elapsed = 0;
    const spacing = 9;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      const time = t * 0.00022;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      for (let row = 0; row < rows; row++) {
        const y = row * spacing;
        for (let col = 0; col < cols; col++) {
          const x = col * spacing;
          const waveA = Math.sin(x * 0.018 + time * 1.25 + Math.sin(y * 0.014) * 1.4);
          const waveB = Math.cos(y * 0.027 - time * 0.8 + x * 0.006);
          const ridge = (waveA + waveB + 2) / 4;
          const edgeFade = Math.max(0, 1 - Math.pow(y / (height * 1.12), 1.55));
          const sideFade = Math.max(0, 1 - Math.pow(Math.abs(x - width * .68) / (width * .9), 2));
          const strength = ridge * edgeFade * sideFade;
          const radius = .35 + strength * 1.05;
          const alpha = .012 + strength * .075;
          ctx.beginPath();
          ctx.fillStyle = `rgba(55,57,62,${alpha})`;
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    function frame(ts) {
      if (document.hidden) { raf = 0; return; }
      if (ts - last >= 42) {
        last = ts;
        elapsed = ts;
        draw(elapsed);
      }
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (reduceMotion || document.hidden || raf) return;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
    resize();
    if (!reduceMotion) start();
  }
  initOcean();

  const DAY_CAP = 180 * 60; // seconds
  const PENALTY = 60 * 60;
  const MEDALS = { none:0, bronze:0, silver:5*60, gold:10*60, top:20*60 };
  const MEDAL_NAMES = { none:"未选择", bronze:"铜牌", silver:"银牌", gold:"金牌", top:"顶级" };
  const STORAGE_KEY = "lose-to-study-v1";
  const $ = id => document.getElementById(id);
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const now = () => Date.now();
  const fresh = () => ({ day: todayKey(), debt: 0, accruedToday: 0, wins: 0, losses: 0, studied: 0, matches: [], sessions: [], timer: null, rankTier: "尊贵铂金", rankDivision: "I", rankStars: 0, rankConfirmed: false });
  let state = load();
  let tickHandle = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh();
      const s = JSON.parse(raw);
      if (!s || typeof s !== "object") return fresh();
      // Daily stats reset on a new local calendar day. An unfinished focus session is preserved.
      if (s.day !== todayKey()) {
        s.day = todayKey(); s.debt = 0; s.accruedToday = 0; s.wins = 0; s.losses = 0; s.studied = 0; s.matches = [];
      }
      s.matches ||= []; s.sessions ||= []; s.debt = Math.max(0, Number(s.debt)||0); s.accruedToday = Math.max(s.debt, Number(s.accruedToday)||0);
      s.rankTier ||= "尊贵铂金"; s.rankDivision ||= "I"; s.rankStars = Math.max(0, Number(s.rankStars)||0); s.rankConfirmed = !!s.rankConfirmed;
      return s;
    } catch { return fresh(); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function remaining() {
    const t = state.timer;
    if (!t) return 0;
    if (t.status === "paused") return Math.max(0, t.remaining);
    return Math.max(0, Math.ceil((t.endAt - now()) / 1000));
  }
  function timerRunning() { return !!state.timer && state.timer.status === "running"; }
  function isTimerComplete() { return !!state.timer && remaining() <= 0; }
  function activeDebt() { return state.debt; }

  function showDialog(title, message, emoji="🐱") {
    $("dialogTitle").textContent = title; $("dialogText").textContent = message; $("dialogEmoji").textContent = emoji;
    $("messageDialog").showModal();
  }
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60;
    return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  function ensureDay() {
    if (state.day !== todayKey()) {
      state.day = todayKey(); state.debt = 0; state.accruedToday = 0; state.wins = 0; state.losses = 0; state.studied = 0; state.matches = [];
      // Do not silently cancel a running session that crossed midnight.
      save();
    }
  }
  function completeSession() {
    if (!state.timer || remaining() > 0) return;
    const session = state.timer;
    const duration = session.duration;
    state.debt = Math.max(0, state.debt - duration);
    state.studied += duration;
    state.sessions.unshift({ at: now(), subject: session.subject, duration });
    state.timer = null;
    save();
    showDialog("本轮完成！", `成功偿还 ${Math.round(duration/60)} 分钟学习债务。可以登记下一局了。`, "🎉");
  }
  function startTimer() {
    ensureDay();
    if (state.timer) return;
    if (state.debt <= 0) { showDialog("没有债务啦", "今天暂时不用补课，先别急着给自己加戏。", "✨"); return; }
    const duration = Math.min(60*60, state.debt);
    state.timer = { status:"running", duration, remaining:duration, endAt:now()+duration*1000, subject:$("subjectSelect").value, startedAt:now() };
    save(); render();
  }
  function pauseTimer() {
    if (!timerRunning()) return;
    state.timer.remaining = remaining(); state.timer.status = "paused"; state.timer.endAt = null;
    save(); render();
  }
  function resumeTimer() {
    if (!state.timer || state.timer.status !== "paused") return;
    state.timer.endAt = now() + state.timer.remaining*1000; state.timer.status = "running";
    save(); render();
  }
  function stopTimer() {
    if (!state.timer) return;
    const left = remaining();
    const elapsed = Math.max(0, state.timer.duration - left);
    // A manually ended session only credits elapsed whole minutes, while preserving the rest as debt.
    const credited = Math.floor(elapsed/60)*60;
    if (credited > 0) {
      state.debt = Math.max(0, state.debt - credited);
      state.studied += credited;
      state.sessions.unshift({ at:now(), subject:state.timer.subject, duration:credited });
    }
    state.timer = null; save(); render();
    showDialog("本轮已结束", credited ? `已记录 ${credited/60} 分钟学习，未完成的债务仍然保留。` : "本轮不足一分钟，没有扣除债务。", "📝");
  }
  function registerMatch(result) {
    ensureDay();
    if (state.debt > 0) return;
    if (state.timer) return;
    if (!state.rankConfirmed) { showDialog("先确认本局段位", "开始下一局前，先填写并确认当前段位和星数。", "🏅"); return; }
    const medal = $("medalSelect").value;
    const reward = MEDALS[medal] || 0;
    const rankLabel = `${state.rankTier}${["最强王者","无双王者","荣耀王者","传奇王者"].includes(state.rankTier) ? "" : " " + ({I:"一",II:"二",III:"三",IV:"四",V:"五"}[state.rankDivision] || "一")} · ${state.rankStars}星`;
    if (result === "lose") {
      const gross = Math.min(PENALTY, DAY_CAP - state.accruedToday);
      if (gross <= 0) { showDialog("今日额度已满", "今天已经累计到180分钟上限。今天就到这里，别再加码啦。", "🧱"); return; }
      const net = Math.max(0, gross - reward);
      state.debt += net;
      state.accruedToday += net;
      state.losses++;
      state.matches.unshift({ at:now(), result:"lose", added:net, reward, medal, rankTier:state.rankTier, rankDivision:state.rankDivision, rankStars:state.rankStars });
      state.rankConfirmed = false;
      save(); render();
      const rewardText = reward ? `获得${MEDAL_NAMES[medal]}奖励，减免${reward/60}分钟；` : "";
      showDialog("本局失败，结算完成", `${rewardText}本局原惩罚${gross/60}分钟，实际新增 ${net/60} 分钟学习债务。段位：${rankLabel}。`, "💀");
    } else {
      state.wins++;
      state.matches.unshift({ at:now(), result:"win", added:0, reward, medal, rankTier:state.rankTier, rankDivision:state.rankDivision, rankStars:state.rankStars });
      state.rankConfirmed = false;
      save(); render();
      const rewardText = reward ? `本局获得${MEDAL_NAMES[medal]}，奖励${reward/60}分钟；由于胜利没有学习债务，本次奖励不累积。` : "本局胜利，不用补课。";
      showDialog("漂亮！", `${rewardText}段位：${rankLabel}。`, "🏆");
    }
    $("medalSelect").value = "none";
  }
  function render() {
    ensureDay();
    const debt = activeDebt();
    $("debtHours").textContent = Math.floor(debt/3600);
    $("debtMinutes").textContent = String(Math.floor(debt%3600/60)).padStart(2,"0");
    $("rankSelect").value = state.rankTier;
    $("divisionSelect").value = state.rankDivision || "I";
    $("starInput").value = state.rankStars;
    $("rankCurrent").hidden = !state.rankConfirmed;
    $("rankCurrent").textContent = state.rankConfirmed ? `本局已确认：${state.rankTier}${["最强王者","无双王者","荣耀王者","传奇王者"].includes(state.rankTier) ? "" : " " + ({I:"一",II:"二",III:"三",IV:"四",V:"五"}[state.rankDivision] || "一")} · ${state.rankStars} 星` : "";
    $("confirmRankBtn").disabled = !!state.timer;
    $("confirmRankBtn").textContent = state.rankConfirmed ? "重新确认段位" : "确认本局段位";
    $("rankHint").textContent = debt > 0 ? "可以先填写并保存段位；还清债务后才能登记下一局。" : (state.rankConfirmed ? "段位已确认；登记本局胜负后，需要重新确认下一局段位。" : "每开一局前确认一次；胜负登记时会保存本局段位。");
    $("debtProgress").style.width = `${Math.min(100, debt/DAY_CAP*100)}%`;
    $("debtCaption").textContent = debt ? `今日债务 ${Math.round(debt/60)} 分钟 / 上限180分钟` : "今天暂时没有学习债务，保持住！";
    const t = state.timer, left = remaining();
    $("timerDisplay").textContent = fmt(left);
    $("timerSub").textContent = !t ? "开始后计入学习时间" : `科目：${t.subject}`;
    const progress = t ? (t.duration-left)/t.duration : 0;
    $("timerRing").style.background = `conic-gradient(var(--purple) ${progress*360}deg,#4b4264 0deg)`;
    $("startBtn").disabled = !!t || debt <= 0;
    $("startBtn").textContent = t ? "学习进行中" : "开始学习";
    $("pauseBtn").disabled = !t;
    $("pauseBtn").textContent = t?.status === "paused" ? "继续" : "暂停";
    $("resetBtn").disabled = !t;
    const canMatch = debt <= 0 && !t && state.rankConfirmed;
    $("winBtn").disabled = !canMatch; $("loseBtn").disabled = !canMatch;
    $("matchPrompt").textContent = debt > 0 ? `还有 ${Math.ceil(debt/60)} 分钟债务未还清。可以先保存段位，但暂时不能登记新对局。` : (!state.rankConfirmed ? "先在上方确认本局段位和星数，再登记胜负。" : "本局段位已确认，可以登记胜负。输了就要学习，规则就是这么朴实无华。");
    $("capHint").textContent = `今日累计新增 ${Math.round(state.accruedToday/60)} / 180 分钟；达到上限后不会继续增加。`;
    $("winsToday").textContent = state.wins; $("lossesToday").textContent = state.losses;
    const total = state.wins+state.losses;
    $("winRate").textContent = total ? `${Math.round(state.wins/total*100)}%` : "—";
    $("studiedToday").textContent = `${Math.round(state.studied/60)}分钟`;
    renderHistory();
    if (t && left <= 0) completeSession();
  }
  function renderHistory() {
    const rows = [];
    state.matches.slice(0,8).forEach(m => rows.push({at:m.at, label:m.result==="win"?"胜利":"失败", detail:`${m.result==="win"?"未增加债务":`+${Math.round((m.added||0)/60)}分钟`} · ${m.rankTier || "段位未记录"} ${m.rankDivision || ""} ${m.rankStars ?? 0}星 · ${MEDAL_NAMES[m.medal] || "未选择"}`, cls:m.result==="win"?"result-win":"result-lose"}));
    state.sessions.slice(0,8).forEach(s => rows.push({at:s.at, label:"学习完成", detail:`${s.subject} · ${Math.round(s.duration/60)}分钟`, cls:""}));
    rows.sort((a,b)=>b.at-a.at);
    $("historyList").innerHTML = rows.length ? rows.slice(0,10).map(r=>`<div class="history-row"><span class="${r.cls}">${r.label}</span><small>${escapeHtml(r.detail)} · ${new Date(r.at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}</small></div>`).join("") : '<p class="empty">还没有记录。第一局的命运由你决定。</p>';
  }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  $("confirmRankBtn").addEventListener("click", ()=>{
    if (state.timer) { showDialog("暂时不能修改", "学习计时进行中，先完成或暂停本轮再确认段位。", "⏳"); return; }
    const tier = $("rankSelect").value;
    const division = $("divisionSelect").value;
    const rawStars = Number($("starInput").value);
    if (!Number.isFinite(rawStars) || rawStars < 0 || rawStars > 999 || !Number.isInteger(rawStars)) {
      showDialog("星数填写有误", "请输入 0 到 999 之间的整数星数。", "🔢"); return;
    }
    state.rankTier = tier; state.rankDivision = division; state.rankStars = rawStars; state.rankConfirmed = true;
    save(); render();
    const divisionText = ["最强王者","无双王者","荣耀王者","传奇王者"].includes(tier) ? "" : " " + ({I:"一",II:"二",III:"三",IV:"四",V:"五"}[division] || "一");
    showDialog("本局段位已确认", `${tier}${divisionText} · ${rawStars} 星。还清债务后就能登记下一局。`, "🏅");
  });
  $("startBtn").addEventListener("click", startTimer);
  $("pauseBtn").addEventListener("click", ()=> state.timer?.status==="paused" ? resumeTimer() : pauseTimer());
  $("resetBtn").addEventListener("click", stopTimer);
  $("winBtn").addEventListener("click", ()=>registerMatch("win"));
  $("loseBtn").addEventListener("click", ()=>registerMatch("lose"));
  $("dialogClose").addEventListener("click", ()=>$("messageDialog").close());
  $("clearHistoryBtn").addEventListener("click", ()=>{
    if (!confirm("确定清空今天的对局和学习记录吗？待偿还债务不会被清除。")) return;
    state.matches=[]; state.sessions=[]; state.wins=0; state.losses=0; state.studied=0; save(); render();
  });
  $("installHint").addEventListener("click", ()=>showDialog("安装到 iPhone 主屏幕", "请用 Safari 打开本网页，点底部「分享」图标，再选择「添加到主屏幕」。安装后就能像普通 App 一样打开。", "📲"));

  // A 1-second UI refresh; actual time is always derived from timestamps, not interval ticks.
  tickHandle = setInterval(()=>{ if (state.timer) render(); else ensureDay(); },1000);
  document.addEventListener("visibilitychange", ()=>{ if (!document.hidden) render(); });
  window.addEventListener("pageshow", render);
  if ("serviceWorker" in navigator) window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  render();
})();
