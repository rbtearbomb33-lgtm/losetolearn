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
  const TIMER_COLORS = ["#B58D8D","#8FA69A","#91A5B8","#B0A0BA","#C3B394","#777C80"];
  const TIMER_COLOR_KEY = "lose-to-study-timer-color";
  let timerColor = localStorage.getItem(TIMER_COLOR_KEY) || TIMER_COLORS[0];
  function applyTimerColor(color) {
    if (!TIMER_COLORS.includes(color)) color = TIMER_COLORS[0];
    timerColor = color;
    document.documentElement.style.setProperty("--timer-accent", color);
    document.querySelectorAll(".swatch").forEach(btn => btn.classList.toggle("active", btn.dataset.color === color));
  }
  document.querySelectorAll(".swatch").forEach(btn => btn.addEventListener("click", () => {
    applyTimerColor(btn.dataset.color);
    localStorage.setItem(TIMER_COLOR_KEY, timerColor);
  }));
  applyTimerColor(timerColor);

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const now = () => Date.now();
  const fresh = () => ({ day: todayKey(), debt: 0, accruedToday: 0, wins: 0, losses: 0, studied: 0, matches: [], sessions: [], timer: null, rankTier: "尊贵铂金", rankDivision: "I", rankStars: 0, rankConfirmed: false, todos: [], lifetimeStudied: 0, studyDays: [], streakClaims: [], dailyGoalClaimed: [], pendingScratch: null });
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
      s.matches ||= []; s.sessions ||= []; s.todos ||= []; s.studyDays ||= []; s.streakClaims ||= []; s.dailyGoalClaimed ||= []; s.pendingScratch ||= null;
      s.lifetimeStudied = Math.max(0, Number(s.lifetimeStudied) || s.sessions.reduce((n,x)=>n+(Number(x.duration)||0),0));
      if (!Array.isArray(s.studyDays) || !s.studyDays.length) {
        const byDay = {};
        s.sessions.forEach(x=>{ const key=new Date(x.at).toLocaleDateString("en-CA"); byDay[key]=(byDay[key]||0)+(Number(x.duration)||0); });
        s.studyDays = Object.keys(byDay).filter(key=>byDay[key]>=1800);
        if ((Number(s.studied)||0)>=1800 && !s.studyDays.includes(todayKey())) s.studyDays.push(todayKey());
      }
      const inferredXp = Math.floor(s.lifetimeStudied/600) + s.studyDays.length*2;
      s.exp = Math.max(0, Number(s.exp)||inferredXp);
      s.debt = Math.max(0, Number(s.debt)||0); s.accruedToday = Math.max(s.debt, Number(s.accruedToday)||0);
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
      // Todos are date-stamped and intentionally remain archived on their original day.
      // Do not silently cancel a running session that crossed midnight.
      save();
    }
  }
  const DAY_NAMES = ["日","一","二","三","四","五","六"];
  const LEVELS = [0,30,80,150,250,400,600,850,1150,1500];
  function levelFor(xp) { let level=1; for(let i=1;i<LEVELS.length;i++) if(xp>=LEVELS[i]) level=i+1; else break; return level; }
  function currentStreak() {
    const days = new Set(state.studyDays || []);
    let count=0, cursor=new Date();
    while(days.has(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`)) { count++; cursor.setDate(cursor.getDate()-1); }
    return count;
  }
  function recordStudy(seconds) {
    if (seconds <= 0) return 0;
    state.studied += seconds;
    state.lifetimeStudied += seconds;
    let bonus = 0;
    const today = todayKey();
    if (state.studied >= 30*60 && !state.dailyGoalClaimed.includes(today)) {
      state.dailyGoalClaimed.push(today); bonus += 2;
    }
    if (state.studied >= 30*60 && !state.studyDays.includes(today)) {
      state.studyDays.push(today);
      const streak = currentStreak();
      const milestones = {3:3,7:7,14:14,30:30};
      const start = new Date(); start.setDate(start.getDate()-streak+1);
      const startKey = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}`;
      Object.entries(milestones).forEach(([day,value])=>{
        const claim = `${startKey}:${day}`;
        if (streak === Number(day) && !state.streakClaims.includes(claim)) { state.streakClaims.push(claim); bonus += value; }
      });
    }
    state.exp = Number(state.exp)||0;
    if (bonus) state.exp += bonus;
    return bonus;
  }
  function drawScratchReward() {
    const n = Math.random();
    if (n < .40) return 1;
    if (n < .70) return 2;
    if (n < .90) return 3;
    if (n < .98) return 5;
    return 10;
  }
  function createScratchTicket(duration, milestoneBonus, session) {
    // A meaningful focus block (10+ credited minutes) earns one guaranteed-positive scratch ticket.
    if (duration < 600) return false;
    state.pendingScratch = { base: drawScratchReward(), bonus: milestoneBonus||0, duration, subject: session.subject, createdAt: now() };
    save();
    showScratchTicket();
    return true;
  }
  function showScratchTicket() {
    const ticket = state.pendingScratch;
    if (!ticket) return;
    $("scratchPrize").innerHTML = `<span class="scratch-prize-label">本次获得</span><strong>+${ticket.base + ticket.bonus} EXP</strong><small>${ticket.bonus ? `随机奖励 ${ticket.base} + 里程碑奖励 ${ticket.bonus}` : `随机成长值 · ${ticket.subject}`}</small>`;
    $("scratchDialog").showModal();
    initScratchCanvas();
  }
  function initScratchCanvas() {
    const canvas = $("scratchCanvas"), ctx = canvas.getContext("2d", {willReadFrequently:true});
    const w = canvas.width, h = canvas.height;
    canvas.style.opacity = "1"; canvas.style.pointerEvents = "auto";
    ctx.globalCompositeOperation = "source-over";
    const grad = ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0,"#d9d9dc"); grad.addColorStop(.45,"#f2f2f3"); grad.addColorStop(1,"#c9c9ce");
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(70,70,76,.12)";
    for(let y=10;y<h;y+=12) for(let x=10;x<w;x+=12) ctx.fillRect(x,y,1,1);
    ctx.fillStyle = "#77777e"; ctx.font = "600 15px system-ui"; ctx.textAlign="center"; ctx.fillText("刮开，看看今天的收获",w/2,h/2+5);
    ctx.globalCompositeOperation = "destination-out";
    let drawing=false, last=null, revealed=false;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};};
    const scratch=e=>{if(!drawing||revealed)return;const p=point(e);ctx.lineWidth=34;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();if(last){ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);}else{ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+0.1,p.y+0.1);}ctx.stroke();last=p;checkScratchProgress(ctx,w,h);};
    canvas.onpointerdown=e=>{drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);scratch(e);};
    canvas.onpointermove=scratch;
    const stop=()=>{drawing=false;last=null;}; canvas.onpointerup=stop;canvas.onpointercancel=stop;canvas.onlostpointercapture=stop;
    function checkScratchProgress(context,width,height){
      const data=context.getImageData(0,0,width,height).data;let cleared=0,total=0;
      for(let i=3;i<data.length;i+=4){total++;if(data[i]<40)cleared++;}
      if(cleared/total>.48&&!revealed){revealed=true;canvas.style.opacity="0";canvas.style.pointerEvents="none";setTimeout(redeemScratch,220);}
    }
  }
  function redeemScratch() {
    if (!state.pendingScratch) return;
    const ticket=state.pendingScratch, total=ticket.base+ticket.bonus;
    state.exp=(Number(state.exp)||0)+ticket.base;
    state.pendingScratch=null;save();render();
    $("scratchDialog").close();
    showDialog("刮开成功！",`本次获得 ${ticket.base} EXP${ticket.bonus?`，另有 ${ticket.bonus} EXP 里程碑奖励`:""}。今天的努力已经记下啦。`,"✦");
  }
  function completeSession() {
    if (!state.timer || remaining() > 0) return;
    const session = state.timer;
    const duration = session.duration;
    state.debt = Math.max(0, state.debt - duration);
    const bonus = recordStudy(duration);
    state.sessions.unshift({ at: now(), subject: session.subject, duration, bonus });
    state.timer = null;
    save(); render();
    if (!createScratchTicket(duration, bonus, session)) showDialog("本轮完成！",`成功偿还 ${Math.round(duration/60)} 分钟学习债务。${bonus?`获得 ${bonus} EXP 里程碑奖励。`:"本轮时间不足 10 分钟，已记录学习进度，但未获得刮奖卡。"}`,"🎉");
  }
  function startTimer() {
    ensureDay();
    if (state.timer) return;
    if (state.debt <= 0) { showDialog("没有债务啦", "今天暂时不用补课，先别急着给自己加戏。", "✨"); return; }
    const duration = Math.min(DAY_CAP, state.debt);
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
    state.timer.endAt = now() + state.timer.remaining*1000;
    state.timer.startedAt = now() - (state.timer.duration - state.timer.remaining)*1000;
    state.timer.status = "running";
    save(); render();
  }
  function stopTimer() {
    if (!state.timer) return;
    const left = remaining();
    const elapsed = Math.max(0, state.timer.duration - left);
    // A manually ended session only credits elapsed whole minutes, while preserving the rest as debt.
    const credited = Math.floor(elapsed/60)*60;
    let bonus = 0; const session = state.timer;
    if (credited > 0) {
      state.debt = Math.max(0, state.debt - credited);
      bonus = recordStudy(credited);
      state.sessions.unshift({ at:now(), subject:session.subject, duration:credited, bonus });
    }
    state.timer = null; save(); render();
    if (credited > 0 && createScratchTicket(credited, bonus, session)) return;
    showDialog("本轮已结束", credited ? `已记录 ${credited/60} 分钟学习，未完成的债务仍然保留。${bonus ? `获得 ${bonus} EXP 里程碑奖励。` : "本轮不足 10 分钟，没有获得刮奖卡。"}` : "本轮不足一分钟，没有扣除债务。", "📝");
  }
  function registerMatch(result) {
    ensureDay();
    if (state.timer) return;
    if (!state.rankConfirmed) { showDialog("先确认本局段位", "开始下一局前，先填写并确认当前段位和星数。", "🏅"); return; }
    const medal = $("medalSelect").value;
    const reward = MEDALS[medal] || 0;
    const rankLabel = `${state.rankTier}${["最强王者","无双王者","荣耀王者","传奇王者"].includes(state.rankTier) ? "" : " " + ({I:"一",II:"二",III:"三",IV:"四",V:"五"}[state.rankDivision] || "一")} · ${state.rankStars}星`;
    if (result === "lose") {
      const remainingCap = Math.max(0, DAY_CAP - state.accruedToday);
      const gross = Math.min(PENALTY, remainingCap);
      const net = Math.max(0, gross - reward);
      state.debt += net;
      state.accruedToday += net;
      state.losses++;
      state.matches.unshift({ at:now(), result:"lose", added:net, reward, medal, rankTier:state.rankTier, rankDivision:state.rankDivision, rankStars:state.rankStars });
      state.rankConfirmed = false;
      save(); render();
      const rewardText = reward ? `获得${MEDAL_NAMES[medal]}奖励，减免${reward/60}分钟；` : "";
      const capText = gross <= 0 ? "今日新增债务已达到180分钟上限，本局仍已记录，但不再增加债务。" : `本局可计入额度 ${gross/60} 分钟，实际新增 ${net/60} 分钟学习债务。`;
      showDialog("本局失败，结算完成", `${rewardText}${capText}段位：${rankLabel}。`, "💀");
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





  function addTodo(title, type, weight) {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, title: title.trim(), type, weight: type === "normal" ? "low" : weight, date: todayKey(), done: false, createdAt: now() };
    if (!item.title) return;
    state.todos.unshift(item); save(); renderTodos();
  }
  function renderTodos() {
    const today = todayKey();
    const items = (state.todos || []).filter(x=>x.date===today);
    const important = items.filter(x=>x.type==="important").sort((a,b)=>({high:0,medium:1,low:2}[a.weight]-({high:0,medium:1,low:2}[b.weight])));
    const normal = items.filter(x=>x.type!=="important");
    const draw = (list, target) => {
      $(target).innerHTML = list.length ? list.map(item=>`<div class="todo-item ${item.type} ${item.done?"done":""}" data-id="${escapeHtml(item.id)}"><input class="todo-check" type="checkbox" ${item.done?"checked":""} aria-label="完成待办"><span class="todo-title">${escapeHtml(item.title)}</span><span class="todo-weight weight-${item.weight}">${({high:"高权重",medium:"中权重",low:"低权重"})[item.weight]||"低权重"}</span><button class="todo-edit" type="button" aria-label="编辑事项">编辑</button><button class="todo-delete" type="button" aria-label="删除事项">×</button></div>`).join("") : '<div class="todo-empty">还没有事项，今天可以慢慢安排。</div>';
    };
    draw(important,"importantTodoList"); draw(normal,"normalTodoList");
    const done=items.filter(x=>x.done).length, open=items.length-done;
    $("todoCount").textContent = `完成 ${done} / ${items.length}`;
    $("todoSummary").textContent = items.length ? (open ? `还有 ${open} 项待完成` : "今天的待办都完成啦") : "把今天想做的事放在这里";
  }
  function renderGrowth() {
    const xp = Number(state.exp)||0, level=levelFor(xp);
    const currentFloor = LEVELS[level-1] ?? 0, next = LEVELS[level] ?? (currentFloor+500);
    $("growthLevel").textContent = `LV.${level}`;
    $("growthXp").textContent = xp;
    $("growthNext").textContent = `距离下一级还差 ${Math.max(0,next-xp)} EXP`;
    $("growthProgress").style.width = `${Math.min(100,Math.max(0,(xp-currentFloor)/(next-currentFloor)*100))}%`;
    const minutes=Math.floor(state.studied/60);
    $("dailyStudyText").textContent = `${minutes} / 30 分钟`;
    $("dailyStudyProgress").style.width = `${Math.min(100,state.studied/1800*100)}%`;
    const streak=currentStreak(); $("streakText").textContent = `连续学习 ${streak} 天`;
    const today=new Date(), start=new Date(today); start.setDate(today.getDate()-6);
    const days=[];
    for(let i=0;i<7;i++) { const d=new Date(start); d.setDate(start.getDate()+i); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; days.push({key,label:DAY_NAMES[d.getDay()],done:(state.studyDays||[]).includes(key),today:key===todayKey()}); }
    $("weekDots").innerHTML=days.map(d=>`<div class="week-day"><i class="${d.done?"done":""} ${d.today?"today":""}"></i><span>${d.label}</span></div>`).join("");
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
    $("rankHint").textContent = debt > 0 ? "可以先填写并保存段位；即使有未偿还债务，也可以继续登记下一局。" : (state.rankConfirmed ? "段位已确认；登记本局胜负后，需要重新确认下一局段位。" : "每开一局前确认一次；胜负登记时会保存本局段位。");
    $("debtProgress").style.width = `${Math.min(100, debt/DAY_CAP*100)}%`;
    $("debtCaption").textContent = debt ? `今日债务 ${Math.round(debt/60)} 分钟 / 上限180分钟` : "今天暂时没有学习债务，保持住！";
    const t = state.timer, left = remaining();
    $("timerDisplay").textContent = fmt(left);
    $("timerSub").textContent = t ? t.subject : "剩余时间";
    if (window.LoseStudyDial) {
      window.LoseStudyDial.update({
        remaining: left,
        duration: t ? t.duration : 3600,
        status: t ? t.status : "idle",
        endAt: t ? t.endAt : null,
        pausedRemaining: t ? t.remaining : null,
        startedAt: t ? t.startedAt : null
      });
    }
    $("startBtn").disabled = !!t || debt <= 0;
    $("startBtn").textContent = t ? "学习进行中" : "开始学习";
    $("pauseBtn").disabled = !t;
    $("pauseBtn").textContent = t?.status === "paused" ? "继续" : "暂停";
    $("resetBtn").disabled = !t;
    const canMatch = !t && state.rankConfirmed;
    $("winBtn").disabled = !canMatch; $("loseBtn").disabled = !canMatch;
    $("matchPrompt").textContent = t
      ? "学习计时进行中，完成或暂停本轮后再登记对局。"
      : (!state.rankConfirmed
        ? (debt > 0 ? `当前还有 ${Math.ceil(debt/60)} 分钟债务未偿还，但仍可继续登记对局。先确认本局段位和星数。` : "先在上方确认本局段位和星数，再登记胜负。")
        : `本局段位已确认，可以登记胜负。今日新增额度还剩 ${Math.max(0, Math.ceil((DAY_CAP-state.accruedToday)/60))} 分钟。`);
    $("capHint").textContent = `今日累计新增 ${Math.round(state.accruedToday/60)} / 180 分钟；达到上限后不会继续增加。`;
    $("winsToday").textContent = state.wins; $("lossesToday").textContent = state.losses;
    const total = state.wins+state.losses;
    $("winRate").textContent = total ? `${Math.round(state.wins/total*100)}%` : "—";
    $("studiedToday").textContent = `${Math.round(state.studied/60)}分钟`;
    renderHistory();
    renderTodos(); renderGrowth();
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
    showDialog("本局段位已确认", `${tier}${divisionText} · ${rawStars} 星。有未偿还债务也可以继续登记下一局。`, "🏅");
  });
  $("startBtn").addEventListener("click", startTimer);
  $("pauseBtn").addEventListener("click", ()=> state.timer?.status==="paused" ? resumeTimer() : pauseTimer());
  $("resetBtn").addEventListener("click", stopTimer);
  $("winBtn").addEventListener("click", ()=>registerMatch("win"));
  $("loseBtn").addEventListener("click", ()=>registerMatch("lose"));
  $("dialogClose").addEventListener("click", ()=>$("messageDialog").close());
  $("scratchClose").addEventListener("click", redeemScratch);
  $("scratchDialog").addEventListener("cancel", event=>{ if(state.pendingScratch) event.preventDefault(); });
  $("addTodoBtn").addEventListener("click", ()=>{ $("todoForm").hidden = !$("todoForm").hidden; if (!$("todoForm").hidden) $("todoTitleInput").focus(); });
  $("cancelTodoBtn").addEventListener("click", ()=>{ $("todoForm").reset(); $("todoForm").hidden=true; });
  $("todoTypeInput").addEventListener("change", ()=>{ const normal=$("todoTypeInput").value==="normal"; $("todoWeightWrap").hidden=normal; if(normal) $("todoWeightInput").value="low"; });
  $("todoForm").addEventListener("submit", event=>{ event.preventDefault(); addTodo($("todoTitleInput").value,$("todoTypeInput").value,$("todoWeightInput").value); $("todoForm").reset(); $("todoWeightWrap").hidden=false; $("todoForm").hidden=true; });
  ["importantTodoList","normalTodoList"].forEach(id=>$(id).addEventListener("change", event=>{
    if (!event.target.classList.contains("todo-check")) return;
    const row=event.target.closest(".todo-item"), item=state.todos.find(x=>x.id===row?.dataset.id); if(!item)return;
    item.done=event.target.checked; save(); renderTodos();
  }));
  ["importantTodoList","normalTodoList"].forEach(id=>$(id).addEventListener("click", event=>{
    const row=event.target.closest(".todo-item"); if(!row)return;
    const item=state.todos.find(x=>x.id===row.dataset.id); if(!item)return;
    if(event.target.classList.contains("todo-delete")){ if(confirm("删除这条待办？")){state.todos=state.todos.filter(x=>x.id!==item.id);save();renderTodos();} }
    if(event.target.classList.contains("todo-edit")){ const title=prompt("修改待办内容",item.title); if(title!==null&&title.trim()){item.title=title.trim();save();renderTodos();} }
  }));
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
  if (state.pendingScratch) showScratchTicket();
})();
